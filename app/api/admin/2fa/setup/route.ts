import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI, NobleCryptoPlugin, ScureBase32Plugin, verify as otpVerify } from "otplib";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

/**
 * GET /api/admin/2fa/setup?token=xxx&email=yyy
 * 셋업 토큰 검증 + TOTP 시크릿 생성 + QR코드 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "토큰과 이메일이 필요합니다." },
        { status: 400 }
      );
    }

    // 관리자 조회 + 셋업 토큰 검증
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || admin.twoFactorSetupToken !== token) {
      return NextResponse.json(
        { error: "유효하지 않은 셋업 링크입니다." },
        { status: 400 }
      );
    }

    if (admin.twoFactorEnabled) {
      return NextResponse.json(
        { error: "이미 2FA가 설정되어 있습니다." },
        { status: 400 }
      );
    }

    // TOTP 시크릿 생성
    const secret = generateSecret();

    // 시크릿을 DB에 임시 저장 (아직 활성화 안 함)
    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorSecret: secret },
    });

    // QR코드 URI 생성
    const otpauthUrl = generateURI({
      secret,
      issuer: "StartPackage",
      label: admin.email,
    });

    // QR코드 이미지 생성
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      secret, // 수동 입력용 시크릿 (QR 스캔 불가 시)
      email: admin.email,
      name: admin.name,
    });
  } catch (error) {
    console.error("2FA 셋업 조회 오류:", error);
    return NextResponse.json(
      { error: "2FA 셋업 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/2fa/setup
 * 첫 TOTP 코드 검증 + 2FA 활성화
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, totpCode } = body;

    if (!token || !email || !totpCode) {
      return NextResponse.json(
        { error: "필수 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(totpCode)) {
      return NextResponse.json(
        { error: "6자리 숫자 코드를 입력해주세요." },
        { status: 400 }
      );
    }

    // 관리자 조회
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin || admin.twoFactorSetupToken !== token) {
      return NextResponse.json(
        { error: "유효하지 않은 셋업 링크입니다." },
        { status: 400 }
      );
    }

    if (!admin.twoFactorSecret) {
      return NextResponse.json(
        { error: "먼저 QR코드를 생성해주세요." },
        { status: 400 }
      );
    }

    if (admin.twoFactorEnabled) {
      return NextResponse.json(
        { error: "이미 2FA가 활성화되어 있습니다." },
        { status: 400 }
      );
    }

    // TOTP 코드 검증
    const result = await otpVerify({
      secret: admin.twoFactorSecret,
      token: totpCode,
      crypto,
      base32,
    });

    if (!result.valid) {
      return NextResponse.json(
        { error: "인증 코드가 일치하지 않습니다. 다시 시도해주세요." },
        { status: 400 }
      );
    }

    // 2FA 활성화 + 셋업 토큰 제거
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSetupToken: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA 설정이 완료되었습니다. 이제 로그인할 수 있습니다.",
    });
  } catch (error) {
    console.error("2FA 활성화 오류:", error);
    return NextResponse.json(
      { error: "2FA 활성화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
