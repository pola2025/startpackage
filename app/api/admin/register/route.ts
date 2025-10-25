import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notification/telegramClient";

/**
 * POST /api/admin/register
 * 관리자 가입 신청
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    // 입력 검증
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "이름, 이메일, 전화번호, 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 전화번호 형식 검증 (숫자와 하이픈만)
    const phoneRegex = /^[0-9-]+$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "올바른 전화번호 형식이 아닙니다." },
        { status: 400 }
      );
    }

    // 비밀번호 길이 검증
    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 최소 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 이미 존재하는 관리자 확인
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "이미 등록된 관리자 이메일입니다." },
        { status: 409 }
      );
    }

    // 이미 존재하는 가입 신청 확인
    const existingRequest = await prisma.adminRequest.findUnique({
      where: { email },
    });

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: "이미 가입 신청이 처리 대기 중입니다." },
          { status: 409 }
        );
      } else if (existingRequest.status === "rejected") {
        return NextResponse.json(
          {
            error: `가입 신청이 거부되었습니다. 사유: ${
              existingRequest.rejectReason || "관리자 검토"
            }`,
          },
          { status: 403 }
        );
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await hash(password, 10);

    // 관리자 가입 신청 생성
    const adminRequest = await prisma.adminRequest.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        status: "pending",
      },
    });

    // 텔레그램으로 관리자에게 알림 발송
    try {
      await notifyAdmin({
        title: "🔐 관리자 가입 신청",
        message: `새로운 관리자 가입 신청이 접수되었습니다.`,
        details: {
          이름: name,
          이메일: email,
          전화번호: phone,
          신청일시: new Date().toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          }),
        },
      });
    } catch (telegramError) {
      console.error("텔레그램 알림 발송 실패:", telegramError);
      // 텔레그램 발송 실패해도 가입 신청은 성공으로 처리
    }

    return NextResponse.json(
      {
        message: "가입 신청이 완료되었습니다. 관리자 승인 후 이메일로 안내드립니다.",
        requestId: adminRequest.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("관리자 가입 신청 오류:", error);
    return NextResponse.json(
      { error: "가입 신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
