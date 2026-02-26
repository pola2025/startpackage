import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// 허용된 필드 목록 (Prisma 스키마 기반)
const ALLOWED_FIELDS = [
  "브랜드명",
  "brandNameEnglish",
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
  "아임웹ID",
  "아임웹PW",
  "아임웹관리자PW",
  "도메인관리사이트",
  "도메인관리ID",
  "도메인관리PW",
  "은행명",
  "계좌번호",
  "대표자생년월일",
  "대표자신분증URL",
  "통신서비스이용증명원URL",
  "신용카드앞면URL",
  "로고예시디자인URL",
  "인쇄물받을주소",
  "메타광고관리자값",
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
];

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
    const body = await request.json();

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

    // Submission 업데이트 (upsert로 안전하게)
    const submission = await prisma.submission.upsert({
      where: { userId },
      create: {
        userId,
        ...filteredData,
        lastAutoSaveAt: new Date(),
      },
      update: {
        ...filteredData,
        lastAutoSaveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      lastAutoSaveAt: submission.lastAutoSaveAt,
    });
  } catch (error) {
    console.error("POST /api/submission/autosave error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
