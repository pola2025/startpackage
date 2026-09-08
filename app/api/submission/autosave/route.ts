import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isPaidHomepageStyle } from "@/lib/homepage-styles";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { dropMaskedSecretFields, encryptSubmissionSecrets } from "@/lib/security/submission-secrets";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// 허용된 필드 목록 (Prisma 스키마 기반)
const ALLOWED_FIELDS = [
  "브랜드명",
  "업종",
  "주소",
  "대표번호",
  "이메일",
  "사업자등록증URL",
  "프로필사진URL",
  "로고URL",
  "로고선호스타일",
  "로고선호색상",
  "로고선호폰트",
  "로고제작요청사항",
  "명함색상",
  "명함시안",
  "계약서시안",
  "도메인주소",
  "홈페이지스타일",
  "홈페이지컬러컨셉",
  "홈페이지제작방식",
  "도메인관리사이트",
  "도메인관리ID",
  "도메인관리PW",
  "은행명",
  "계좌번호",
  "계좌명의자명",
  "대표자신분증URL",
  "통신서비스이용증명원URL",
  "신용카드앞면URL",
  "로고예시디자인URL",
  "로고예시디자인2URL",
  "인쇄물받을주소",
  "받는분이름",
  "수령연락처",
  "우편번호",
  "네이버검색광고ID",
  "네이버검색광고PW",
  "네이버클라우드ID",
  "네이버클라우드PW",
  "InstagramID",
  "InstagramPW",
  "GmailID",
  "GmailPW",
  "해외결제카드앞면URL",
  "해외결제카드뒷면URL",
  "해외결제카드유효기간",
  "해외결제카드CVC",
];

const SHIPPING_FIELDS = ["인쇄물받을주소", "받는분이름", "수령연락처", "우편번호"];

async function hasLockedShippingConflict(userId: string, data: Record<string, unknown>) {
  const fields = SHIPPING_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));
  if (!fields.length) return false;
  const locked = await prisma.workflow.findFirst({
    where: { userId, type: { notIn: ["로고", "홈페이지"] }, status: { in: ["발주요청", "발주완료", "제작완료", "발송완료"] } },
    select: { id: true },
  });
  if (!locked) return false;
  const current = await prisma.submission.findUnique({ where: { userId } });
  return fields.some((field) => data[field] !== (current?.[field as keyof typeof current] ?? null));
}

/**
 * POST: 자동 저장 (슬랙 알림, 워크플로우 생성 없이 데이터만 저장)
 * - 2초 디바운스로 호출됨
 * - 알림 없이 조용히 저장
 * - Zod 검증 없이 허용 필드만 필터링 (autosave는 관대하게)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = dropMaskedSecretFields(await request.json());

    // 허용된 필드만 필터링 (Zod 검증 대신 간단한 필터링)
    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      // 허용된 필드만 포함
      if (!ALLOWED_FIELDS.includes(key)) continue;

      // null, undefined, 빈 문자열 처리
      if (value === null || value === undefined) {
        continue;
      } else if (value === "") {
        filteredData[key] = null;
      } else {
        filteredData[key] = value;
      }
    }

    // 저장할 데이터가 없으면 조기 리턴
    if (Object.keys(filteredData).length === 0) {
      return NextResponse.json({ success: true, message: "No data to save" });
    }

    if (isPaidHomepageStyle(String(filteredData.홈페이지스타일 || ""))) {
      return NextResponse.json(
        {
          error:
            "유료옵션은 Meta 광고 유료 결제 시 제공되며 개별문의가 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      const submission = await callCore<Record<string, unknown>>("submission-save", userId, {
        userId,
        data: { ...filteredData, lastAutoSaveAt: Date.now() },
      });
      return NextResponse.json({ success: true, lastAutoSaveAt: submission.lastAutoSaveAt });
    }

    if (await hasLockedShippingConflict(userId, filteredData)) {
      return NextResponse.json({ error: "발주 요청 이후 배송지는 변경할 수 없습니다." }, { status: 409 });
    }

    // Submission 업데이트 (upsert로 안전하게)
    const encryptedData = encryptSubmissionSecrets(filteredData, userId);
    const submission = await prisma.submission.upsert({
      where: { userId },
      create: {
        userId,
        ...encryptedData,
        lastAutoSaveAt: new Date(),
      },
      update: {
        ...encryptedData,
        lastAutoSaveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      lastAutoSaveAt: submission.lastAutoSaveAt,
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("POST /api/submission/autosave error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
