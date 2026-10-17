import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import {
  decryptSubmissionSecrets,
  MASKED_SECRET,
} from "@/lib/security/submission-secrets";
import {
  sendMetaSetupRequestNotifications,
  type MetaSetupUser,
} from "@/lib/notification/metaSetup";
import { metaSetupStage, toEpochMs } from "@/lib/submission/parts";

const NO_STORE = { "Cache-Control": "no-store" };
/** 같은 요청을 연달아 보내 알림이 반복되지 않게 막는 간격 */
const RESUBMIT_GAP_MS = 30_000;

const requestSchema = z.object({
  type: z.enum(["instagram", "google"], {
    errorMap: () => ({ message: "인스타그램 계정이 있는지 골라 주세요." }),
  }),
  loginId: z
    .string()
    .trim()
    .min(1, "아이디를 입력해 주세요.")
    .max(256, "아이디가 너무 깁니다."),
  password: z
    .string()
    .min(1, "비밀번호를 입력해 주세요.")
    .max(256, "비밀번호가 너무 깁니다."),
  memo: z
    .string()
    .trim()
    .max(1000, "전달할 내용은 1000자 이하로 적어 주세요.")
    .optional()
    .nullable(),
});

type MetaRow = Record<string, unknown>;

async function loadRow(userId: string): Promise<MetaRow> {
  const row = await callDataService<MetaRow>("content-domain/meta-setup-get", {
    userId,
  });
  return decryptSubmissionSecrets(row ?? {}, userId);
}

function publicView(row: MetaRow) {
  const type =
    row.MetaSetupType === "google"
      ? "google"
      : row.MetaSetupType === "instagram"
        ? "instagram"
        : null;
  const stage = metaSetupStage(row);
  return {
    stage,
    type,
    loginId:
      type === "google"
        ? (row.MetaGoogleID ?? null)
        : type === "instagram"
          ? (row.InstagramID ?? null)
          : null,
    hasPassword: Boolean(
      type === "google"
        ? row.MetaGooglePW
        : type === "instagram"
          ? row.InstagramPW
          : null,
    ),
    memo: row.MetaSetupMemo ?? null,
    requestedAt: toEpochMs(row.MetaSetupRequestedAt),
    doneAt: toEpochMs(row.MetaSetupDoneAt),
    emailSentAt: toEpochMs(row.MetaTokenEmailSentAt),
    // 토큰은 설정이 끝난 뒤 본인에게만 보여 준다
    tokens:
      stage === "done" && row.MetaSystemUserToken && row.MetaThreadsToken
        ? {
            systemUserToken: row.MetaSystemUserToken,
            threadsToken: row.MetaThreadsToken,
          }
        : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  if (!isD1RuntimeEnabled())
    return NextResponse.json(
      { error: "지금은 사용할 수 없습니다." },
      { status: 503 },
    );
  try {
    const row = await loadRow(session.user.id);
    return NextResponse.json(publicView(row), { headers: NO_STORE });
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("[meta-setup] GET 실패:", error);
    return NextResponse.json(
      { error: "요청 내용을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  if (!isD1RuntimeEnabled())
    return NextResponse.json(
      { error: "지금은 사용할 수 없습니다." },
      { status: 503 },
    );
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message || "입력 내용을 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  try {
    const current = await loadRow(userId);
    const lastRequestedAt = toEpochMs(current.MetaSetupRequestedAt);
    if (lastRequestedAt && Date.now() - lastRequestedAt < RESUBMIT_GAP_MS) {
      return NextResponse.json(
        { error: "방금 요청을 받았습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }

    // 비밀번호를 바꾸지 않고 수정하면 같은 계정 유형의 기존 비밀번호를 그대로 쓴다
    let password = parsed.data.password;
    if (password === MASKED_SECRET) {
      const existing =
        parsed.data.type === "google"
          ? current.MetaGooglePW
          : current.InstagramPW;
      if (typeof existing !== "string" || !existing) {
        return NextResponse.json(
          { error: "비밀번호를 입력해 주세요." },
          { status: 400 },
        );
      }
      password = existing;
    }

    const memo = parsed.data.memo ? parsed.data.memo : null;
    const result = await callDataService<{
      updated: boolean;
      requestedAt: number;
      notification?: MetaSetupUser | null;
    }>("content-domain/meta-setup-request", {
      userId,
      request: {
        type: parsed.data.type,
        loginId: parsed.data.loginId,
        password,
        memo,
      },
    });

    await sendMetaSetupRequestNotifications(
      result.notification ?? {},
      {
        type: parsed.data.type,
        loginId: parsed.data.loginId,
        password,
        memo,
        updated: result.updated,
      },
      async (channelId) => {
        await callDataService("shared-domain/user-slack-channel-update", {
          userId,
          slackChannelId: channelId,
        });
      },
    );

    return NextResponse.json(
      { success: true, requestedAt: result.requestedAt },
      { headers: NO_STORE },
    );
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("[meta-setup] POST 실패:", error);
    return NextResponse.json(
      { error: "요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
