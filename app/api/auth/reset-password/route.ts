import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

// 임시 비밀번호 생성 (4자리 숫자)
function generateTempPassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// IP 기반 rate limit (best-effort 인메모리, 10분에 5회)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_LIMIT = 5;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (entry.count >= IP_LIMIT) return false;
  entry.count += 1;
  return true;
}

// Content-Type 검증 필수
function isJson(req: NextRequest): boolean {
  const ct = req.headers.get("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

export async function POST(request: NextRequest) {
  try {
    if (!isJson(request)) {
      return NextResponse.json(
        { error: "application/json 요청만 허용됩니다." },
        { status: 415 },
      );
    }

    // IP rate limit
    const ip = getClientIp(request);
    if (!checkIpRate(ip)) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }
    const { 연락처 } = body;

    if (!연락처 || typeof 연락처 !== "string" || 연락처.length > 20) {
      return NextResponse.json(
        { error: "전화번호를 입력해주세요." },
        { status: 400 },
      );
    }

    // 전화번호로 사용자 찾기
    const cleanPhone = 연락처.replace(/-/g, "");
    // 하이픈 포함/미포함 형식 모두 검색 (DB 데이터 불일치 대응)
    const formattedPhone = cleanPhone.replace(
      /(\d{3})(\d{3,4})(\d{4})/,
      "$1-$2-$3",
    );

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ 연락처: cleanPhone }, { 연락처: formattedPhone }],
      },
      include: { cohort: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "등록되지 않은 전화번호입니다." },
        { status: 404 },
      );
    }

    // SMS 수신 동의 확인
    if (!user.SMS수신동의) {
      return NextResponse.json(
        { error: "SMS 수신 동의가 필요합니다. 관리자에게 문의하세요." },
        { status: 400 },
      );
    }

    // 전화번호 기준 쿨다운 5분 — 기존 Notification 테이블로 중복 발송 차단
    const recentReset = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "비밀번호재발급",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recentReset) {
      return NextResponse.json(
        { error: "최근 재발급 요청이 있습니다. 5분 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    // 임시 비밀번호 생성
    const tempPassword = generateTempPassword();
    const hashedPassword = await hash(tempPassword, 10);

    // 비밀번호 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // SMS 발송
    try {
      const { sendSMS } = await import("@/lib/sms/ncpSensClient");

      const message = `[스타트패키지] 임시 비밀번호가 발급되었습니다.\n\n임시 비밀번호: ${tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`;

      await sendSMS(user.연락처, message);

      console.log(`✅ 임시 비밀번호 발송: ${user.이름} (${user.연락처})`);
    } catch (smsError) {
      console.error("SMS 발송 실패:", smsError);
      // SMS 실패해도 비밀번호는 변경됨
      return NextResponse.json({
        success: true,
        message:
          "임시 비밀번호가 생성되었으나 SMS 발송에 실패했습니다. 관리자에게 문의하세요.",
        warning: true,
      });
    }

    // 알림 로그 저장
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "비밀번호재발급",
        channel: "SMS",
        title: "[스타트패키지] 임시 비밀번호 발급",
        message: `임시 비밀번호: ${tempPassword}`,
        status: "성공",
      },
    });

    return NextResponse.json({
      success: true,
      message: `${user.이름}님의 휴대폰으로 임시 비밀번호가 발송되었습니다.`,
    });
  } catch (error: any) {
    console.error("비밀번호 재발급 에러:", error);
    return NextResponse.json(
      { error: "비밀번호 재발급 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
