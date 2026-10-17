import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { recordId } from "@/lib/validation/schemas";
import {
  decryptSubmissionSecrets,
  MASKED_SECRET,
} from "@/lib/security/submission-secrets";
import { sendPolaradMail } from "@/lib/email/polaradMailer";
import {
  buildMetaTokenEmail,
  sendMetaSetupDoneNotifications,
  type MetaSetupUser,
} from "@/lib/notification/metaSetup";

const NO_STORE = { "Cache-Control": "no-store" };

const tokenField = (label: string) =>
  z.union([
    z.literal(MASKED_SECRET),
    z
      .string()
      .trim()
      .min(20, `${label}을 확인해 주세요.`)
      .max(4096, `${label}이 너무 깁니다.`),
  ]);

const bodySchema = z.object({
  systemUserToken: tokenField("시스템사용자 토큰"),
  threadsToken: tokenField("쓰레드 토큰"),
});

/**
 * PATCH /api/admin/meta-setup/[id] (id = 교육생 userId)
 * Meta 설정 완료 처리: 토큰 2개 저장 → mkt@polarad.co.kr 로 교육생에게 메일 → 슬랙·텔레그램 완료 알림
 * 토큰 칸에 마스킹 값(••••)을 그대로 보내면 저장된 토큰으로 메일만 다시 보낸다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (
    !session?.user?.id ||
    !userRole ||
    !["super", "designer", "operator"].includes(userRole)
  ) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (!isD1RuntimeEnabled())
    return NextResponse.json(
      { error: "지금은 사용할 수 없습니다." },
      { status: 503 },
    );

  const { id } = await params;
  if (!recordId().safeParse(id).success)
    return NextResponse.json(
      { error: "잘못된 사용자입니다." },
      { status: 400 },
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "토큰을 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    let { systemUserToken, threadsToken } = parsed.data;
    if (systemUserToken === MASKED_SECRET || threadsToken === MASKED_SECRET) {
      const stored = decryptSubmissionSecrets(
        (await callDataService<Record<string, unknown>>(
          "content-domain/meta-setup-get",
          { userId: id },
        )) ?? {},
        id,
      );
      if (systemUserToken === MASKED_SECRET)
        systemUserToken = String(stored.MetaSystemUserToken || "");
      if (threadsToken === MASKED_SECRET)
        threadsToken = String(stored.MetaThreadsToken || "");
      if (!systemUserToken || !threadsToken) {
        return NextResponse.json(
          { error: "저장된 토큰이 없습니다. 토큰을 입력해 주세요." },
          { status: 400 },
        );
      }
    }
    if (systemUserToken === threadsToken) {
      return NextResponse.json(
        { error: "두 토큰이 같습니다. 각각 맞는 토큰을 넣어 주세요." },
        { status: 400 },
      );
    }

    const result = await callDataService<{
      doneAt: number;
      notification?: MetaSetupUser | null;
    }>("content-domain/meta-setup-complete", {
      adminId: session.user.id,
      userId: id,
      tokens: {
        MetaSystemUserToken: systemUserToken,
        MetaThreadsToken: threadsToken,
      },
    });
    const user = result.notification ?? {};

    let emailSent = false;
    let emailError: string | undefined;
    if (!user.email) {
      emailError = "교육생 이메일이 없습니다";
    } else {
      try {
        await sendPolaradMail({
          to: user.email,
          ...buildMetaTokenEmail({
            name: user.name,
            systemUserToken,
            threadsToken,
          }),
        });
        emailSent = true;
        await callDataService("content-domain/meta-setup-email-sent", {
          adminId: session.user.id,
          userId: id,
          sentAt: Date.now(),
        });
      } catch (error) {
        emailError =
          error instanceof Error
            ? error.message.slice(0, 120)
            : "메일 발송 실패";
        console.error("[admin/meta-setup] 토큰 메일 발송 실패:", emailError);
      }
    }

    await sendMetaSetupDoneNotifications(user, {
      sent: emailSent,
      error: emailError,
    });

    return NextResponse.json(
      {
        success: true,
        doneAt: result.doneAt,
        emailSent,
        emailError,
        email: user.email ?? null,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("[admin/meta-setup] 완료 처리 실패:", error);
    return NextResponse.json(
      { error: "완료 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
