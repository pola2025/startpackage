import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { signIn } from "@/auth";
import { notifyAdmin } from "@/lib/notification/telegramClient";

// 회원가입 유효성 검증 스키마
const signupSchema = z.object({
  이름: z
    .string()
    .min(2, "이름은 최소 2자 이상이어야 합니다.")
    .max(50, "이름은 최대 50자까지 입력 가능합니다.")
    .regex(/^[가-힣a-zA-Z\s]+$/, "이름은 한글 또는 영문만 입력 가능합니다."),

  연락처: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      "올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)"
    ),

  이메일: z
    .string()
    .email("올바른 이메일 형식이 아닙니다.")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .regex(
      /^\d{4}$/,
      "비밀번호는 숫자 4자리로 입력해주세요."
    ),

  cohortId: z.string().cuid("유효하지 않은 기수 ID입니다."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod 스키마로 입력값 검증
    const validationResult = signupSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: errors,
        },
        { status: 400 }
      );
    }

    const { 이름, 연락처, 이메일, password, cohortId } = validationResult.data;

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: 이메일 },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 400 }
      );
    }

    // 선택한 기수 확인
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      return NextResponse.json(
        { error: "유효하지 않은 기수입니다." },
        { status: 400 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await hash(password, 10);


    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: 이메일,
        password: hashedPassword,
        이름,
        연락처: 연락처.replace(/-/g, ""), // 하이픈 제거
        cohortId,
        SMS수신동의: true,
        이메일수신동의: true,
        role: "user",
        
      },
    });

    // 기본 워크플로우 생성 (명함, 명찰, 대봉투, 자문계약서 표지, 자문계약서 내지, 홈페이지)
    await prisma.workflow.createMany({
      data: [
        { userId: user.id, type: "명함", status: "대기" },
        { userId: user.id, type: "명찰", status: "대기" },
        { userId: user.id, type: "대봉투", status: "대기" },
        { userId: user.id, type: "자문계약서 표지", status: "대기" },
        { userId: user.id, type: "자문계약서 내지", status: "대기" },
        { userId: user.id, type: "홈페이지", status: "대기" },
      ],
    });

    // 기본 submission 생성
    await prisma.submission.create({
      data: {
        userId: user.id,
      },
    });

    // 텔레그램 관리자 알림 (신규 회원 가입)
    await notifyAdmin({
      title: "🎉 신규 회원 가입",
      message: `${cohort.name} 신규 회원이 가입했습니다.`,
      details: {
        기수: cohort.name,
        이름: 이름,
        연락처,
        이메일,
      },
    }).catch((error) => {
      console.error("텔레그램 알림 발송 실패:", error);
      // 알림 실패는 무시하고 계속 진행
    });

    return NextResponse.json({
      success: true,
      message: "가입이 완료되었습니다.",
      user: {
        id: user.id,
        email: user.email,
        이름: user.이름,
      },
    });
  } catch (error) {
    console.error("회원가입 에러:", error);
    return NextResponse.json(
      { error: "가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
