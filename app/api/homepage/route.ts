import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isPaidHomepageStyle } from "@/lib/homepage-styles";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { sendHomepageRequestNotifications } from "@/lib/notification/homepageRequest";
import {
  decryptSubmissionSecrets,
  encryptSubmissionSecrets,
  MASKED_SECRET,
  maskSubmissionSecrets,
} from "@/lib/security/submission-secrets";

// 외부 서비스 제작 스키마
const externalSchema = z.object({
  홈페이지제작방식: z.literal("외부서비스"),
  해외결제카드앞면URL: z.string().min(1, "카드 사진을 업로드해주세요"),
  해외결제카드뒷면URL: z.string().optional(),
  해외결제카드유효기간: z.union([
    z.string().regex(/^\d{2}\/\d{2}$/, "MM/YY 형식으로 입력해주세요"),
    z.literal(MASKED_SECRET),
  ]),
  해외결제카드CVC: z.union([
    z.string().regex(/^\d{3}$/, "CVC 번호는 3자리 숫자입니다"),
    z.literal(MASKED_SECRET),
  ]),
  홈페이지스타일: z.string().optional(),
  홈페이지컬러컨셉: z.string().optional(),
  GmailID: z.string().min(1, "Gmail ID를 입력해주세요"),
  GmailPW: z.union([z.string().min(1, "Gmail 비밀번호를 입력해주세요"), z.literal(MASKED_SECRET)]),
});

const HOMEPAGE_SECRET_FIELDS = [
  "해외결제카드앞면URL",
  "해외결제카드뒷면URL",
  "해외결제카드유효기간",
  "해외결제카드CVC",
  "GmailPW",
] as const;

type HomepageSecretField = (typeof HOMEPAGE_SECRET_FIELDS)[number];

function resolveHomepageSecrets(
  body: Record<string, string | null | undefined>,
  existing: Record<string, unknown> | null | undefined,
  userId: string,
) {
  const plaintext = { ...body } as Record<string, string | null | undefined>;
  for (const field of HOMEPAGE_SECRET_FIELDS) {
    const value = body[field];
    if (value !== MASKED_SECRET) continue;
    const oldValue = existing?.[field];
    if (typeof oldValue !== "string" || oldValue.length === 0) {
      throw new Error("MASKED_SECRET_WITHOUT_EXISTING_VALUE");
    }
    plaintext[field] = decryptSubmissionSecrets(
      { [field]: oldValue },
      userId,
    )[field] as string;
  }
  return { plaintext };
}

function validateResolvedHomepageSecrets(
  values: Record<string, string | null | undefined>,
): boolean {
  return (
    typeof values.해외결제카드유효기간 === "string" &&
    /^\d{2}\/\d{2}$/.test(values.해외결제카드유효기간) &&
    typeof values.해외결제카드CVC === "string" &&
    /^\d{3}$/.test(values.해외결제카드CVC) &&
    typeof values.GmailPW === "string" &&
    values.GmailPW.length > 0 &&
    values.GmailPW !== MASKED_SECRET
  );
}

// GET: 현재 사용자의 홈페이지 정보 조회
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isD1RuntimeEnabled()) {
      const result = await callDataService<Record<string, unknown>>("content-domain/homepage-get", { userId: session.user.id });
      return NextResponse.json(maskSubmissionSecrets(result));
    }

    const submission = await prisma.submission.findUnique({
      where: { userId: session.user.id },
      select: {
        홈페이지제작방식: true,
        홈페이지스타일: true,
        홈페이지컬러컨셉: true,
        해외결제카드앞면URL: true,
        해외결제카드뒷면URL: true,
        해외결제카드유효기간: true,
        해외결제카드CVC: true,
        GmailID: true,
        GmailPW: true,
      },
    });

    return NextResponse.json(maskSubmissionSecrets(submission || {}));
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("Failed to fetch homepage info:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage info" },
      { status: 500 },
    );
  }
}

// POST: 홈페이지 정보 저장
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 홈페이지제작방식 } = body;

    // 외부서비스 방식만 지원
    if (홈페이지제작방식 !== "외부서비스") {
      return NextResponse.json(
        { error: "유효하지 않은 제작 방식입니다" },
        { status: 400 },
      );
    }

    const result = externalSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      );
    }

    if (isPaidHomepageStyle(result.data.홈페이지스타일)) {
      return NextResponse.json(
        {
          error:
            "유료옵션은 Meta 광고 유료 결제 시 제공되며 개별문의가 필요합니다.",
        },
        { status: 400 },
      );
    }

    // 업데이트 데이터 준비
    const updateData: Record<string, string | null> = {
      홈페이지제작방식: 홈페이지제작방식,
      홈페이지스타일: body.홈페이지스타일 || null,
      홈페이지컬러컨셉: body.홈페이지컬러컨셉 || null,
      GmailID: body.GmailID || null,
      GmailPW: body.GmailPW || null,
      해외결제카드앞면URL: body.해외결제카드앞면URL,
      해외결제카드뒷면URL: body.해외결제카드뒷면URL || null,
      해외결제카드유효기간: body.해외결제카드유효기간,
      해외결제카드CVC: body.해외결제카드CVC,
    };

    let existingSecrets: Record<string, unknown> | null = null;
    if (isD1RuntimeEnabled()) {
      existingSecrets = await callDataService<Record<string, unknown>>("content-domain/homepage-get", { userId: session.user.id });
    } else {
      existingSecrets = await prisma.submission.findUnique({
        where: { userId: session.user.id },
        select: {
          해외결제카드앞면URL: true,
          해외결제카드뒷면URL: true,
          해외결제카드유효기간: true,
          해외결제카드CVC: true,
          GmailPW: true,
        },
      }) as Record<string, unknown> | null;
    }
    let plaintextUpdate: Record<string, string | null | undefined>;
    try {
      const resolved = resolveHomepageSecrets(updateData, existingSecrets, session.user.id);
      Object.assign(updateData, resolved.plaintext);
      plaintextUpdate = resolved.plaintext;
      if (!validateResolvedHomepageSecrets(plaintextUpdate)) {
        return NextResponse.json({ error: "민감정보 형식을 확인해주세요." }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof Error && error.message === "MASKED_SECRET_WITHOUT_EXISTING_VALUE") {
        return NextResponse.json({ error: "기존 민감정보를 확인할 수 없습니다. 다시 입력해주세요." }, { status: 400 });
      }
      throw error;
    }

    if (isD1RuntimeEnabled()) {
      const result = await callDataService<{ notification?: { name?: string; cohortName?: string; brandName?: string; slackChannelId?: string } }>("content-domain/homepage-update", { userId: session.user.id, changes: updateData });
      await sendHomepageRequestNotifications(result.notification ?? {}, {
        홈페이지제작방식,
        해외결제카드유효기간: plaintextUpdate.해외결제카드유효기간 as string,
        해외결제카드CVC: plaintextUpdate.해외결제카드CVC as string,
        GmailID: body.GmailID,
        GmailPW: plaintextUpdate.GmailPW as string,
        홈페이지스타일: body.홈페이지스타일,
        홈페이지컬러컨셉: body.홈페이지컬러컨셉,
      });
      return NextResponse.json({ success: true });
    }

    const storedUpdateData = encryptSubmissionSecrets(updateData, session.user.id);

    // Submission이 없으면 생성, 있으면 업데이트
    const existingSubmission = await prisma.submission.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSubmission) {
      // 기존 데이터 업데이트
      await prisma.submission.update({
        where: { userId: session.user.id },
        data: storedUpdateData,
      });
    } else {
      // 새로 생성
      await prisma.submission.create({
        data: {
          userId: session.user.id,
          ...storedUpdateData,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        cohort: { select: { name: true } },
        submission: { select: { 브랜드명: true } },
      },
    });
    await sendHomepageRequestNotifications(
      {
        name: user?.이름,
        cohortName: user?.cohort?.name,
        brandName: user?.submission?.브랜드명,
        slackChannelId: user?.slackChannelId,
      },
      {
        홈페이지제작방식,
        해외결제카드유효기간: plaintextUpdate.해외결제카드유효기간 as string,
        해외결제카드CVC: plaintextUpdate.해외결제카드CVC as string,
        GmailID: body.GmailID,
        GmailPW: plaintextUpdate.GmailPW as string,
        홈페이지스타일: body.홈페이지스타일,
        홈페이지컬러컨셉: body.홈페이지컬러컨셉,
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("Failed to save homepage info:", error);
    return NextResponse.json(
      { error: "Failed to save homepage info" },
      { status: 500 },
    );
  }
}
