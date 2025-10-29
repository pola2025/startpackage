import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * POST /api/admin/send-message
 *
 * 개별 사용자에게 SMS 또는 이메일 발송
 */

const sendMessageSchema = z.object({
  userId: z.string().cuid("유효하지 않은 사용자 ID입니다."),
  channel: z.enum(["SMS", "EMAIL"], {
    errorMap: () => ({ message: "SMS 또는 EMAIL을 선택해주세요." }),
  }),
  title: z.string().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이내로 입력해주세요."),
  message: z.string().min(1, "메시지를 입력해주세요.").max(1000, "메시지는 1000자 이내로 입력해주세요."),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const adminRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(adminRole)) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "입력값이 유효하지 않습니다.",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { userId, channel, title, message } = validation.data;

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        연락처: true,
        email: true,
        SMS수신동의: true,
        이메일수신동의: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수신 동의 확인
    if (channel === "SMS" && !user.SMS수신동의) {
      return NextResponse.json(
        { error: `${user.이름} 사용자가 SMS 수신에 동의하지 않았습니다.` },
        { status: 400 }
      );
    }

    if (channel === "EMAIL" && !user.이메일수신동의) {
      return NextResponse.json(
        { error: `${user.이름} 사용자가 이메일 수신에 동의하지 않았습니다.` },
        { status: 400 }
      );
    }

    // 알림 기록 생성
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "수동발송",
        channel,
        title,
        message,
        status: "전송중",
        sentBy: (session.user as any).id,
        sentByName: (session.user as any).name || "관리자",
      },
    });

    // 실제 발송 (비동기)
    let sendResult = { success: false, error: "" };

    if (channel === "SMS") {
      // SMS 발송
      try {
        const { sendSMS } = await import("@/lib/sms/ncpSensClient");
        await sendSMS(user.연락처, `[${title}]\n\n${message}`);
        sendResult.success = true;
      } catch (error: any) {
        console.error("❌ SMS 발송 실패:", error);
        sendResult.error = error.message || "SMS 발송에 실패했습니다.";
      }
    } else {
      // 이메일 발송
      try {
        const { sendEmail } = await import("@/lib/email/emailClient");
        await sendEmail({
          to: user.email,
          subject: title,
          html: message.replace(/\n/g, "<br>"),
        });
        sendResult.success = true;
      } catch (error: any) {
        console.error("❌ 이메일 발송 실패:", error);
        sendResult.error = error.message || "이메일 발송에 실패했습니다.";
      }
    }

    // 알림 상태 업데이트
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: sendResult.success ? "성공" : "실패",
        errorMessage: sendResult.error || null,
      },
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${channel === "SMS" ? "문자" : "이메일"}를 성공적으로 발송했습니다.`,
      notification: {
        id: notification.id,
        channel,
        sentAt: notification.sentAt,
      },
    });
  } catch (error) {
    console.error("❌ 개별 메시지 발송 실패:", error);
    return NextResponse.json(
      { error: "메시지 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
