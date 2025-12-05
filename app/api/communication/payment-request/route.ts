import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  createPaymentRequestSlackChannel,
  sendPaymentRequestInfo,
  uploadSensitiveFileToSlack,
} from "@/lib/notification/slackClient";
import { sendTelegramMessage } from "@/lib/notification/telegramClient";

/**
 * 결제요청 전용 API
 * - 카드 이미지는 슬랙으로만 전송, 서버에 저장하지 않음
 * - 민감 정보(비밀번호 등)는 슬랙/텔레그램으로만 전송, DB에 저장 안 함
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name;

    // FormData 처리 (이미지 파일 포함)
    const formData = await request.formData();

    // 필수 필드
    const imwebId = formData.get("imwebId") as string;
    const adminPassword = formData.get("adminPassword") as string;
    const birthDate = formData.get("birthDate") as string;
    const paymentPeriod = formData.get("paymentPeriod") as string;

    // 선택 필드 (네이버 로그인)
    const isNaverLogin = formData.get("isNaverLogin") === "true";
    const naverId = formData.get("naverId") as string | null;
    const naverPw = formData.get("naverPw") as string | null;

    // 카드 이미지 (File 객체)
    const cardImage = formData.get("cardImage") as File | null;

    // 유효성 검사
    if (!imwebId || !adminPassword || !birthDate || !paymentPeriod) {
      return NextResponse.json(
        { error: "필수 정보를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    // 관리자 비밀번호 검증 (대문자+소문자+숫자 조합)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!passwordRegex.test(adminPassword)) {
      return NextResponse.json(
        { error: "관리자 비밀번호는 대문자, 소문자, 숫자를 모두 포함해야 합니다" },
        { status: 400 }
      );
    }

    if (!cardImage) {
      return NextResponse.json(
        { error: "카드 이미지를 업로드해주세요" },
        { status: 400 }
      );
    }

    // 네이버 로그인 선택 시 ID/PW 필수
    if (isNaverLogin && (!naverId || !naverPw)) {
      return NextResponse.json(
        { error: "네이버 로그인 정보를 입력해주세요" },
        { status: 400 }
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        cohort: true,
        submission: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    const brandName = user.submission?.브랜드명 || "브랜드미정";
    const cohortName = user.cohort?.name || "";

    // 1. 슬랙 채널 생성
    const slackChannelId = await createPaymentRequestSlackChannel({
      brandName,
      userName,
      cohortName,
      userEmail: user.email,
      userPhone: user.연락처,
    });

    if (!slackChannelId) {
      console.error("슬랙 채널 생성 실패");
      // 슬랙 실패해도 계속 진행 (텔레그램으로 백업)
    }

    // 2. 슬랙에 결제 정보 전송
    if (slackChannelId) {
      await sendPaymentRequestInfo({
        channelId: slackChannelId,
        imwebId,
        isNaverLogin,
        naverId: naverId || undefined,
        naverPw: naverPw || undefined,
        adminPassword,
        birthDate,
        paymentPeriod,
        userName,
      });

      // 3. 카드 이미지를 슬랙으로 직접 업로드 (서버 저장 안 함)
      if (cardImage) {
        const arrayBuffer = await cardImage.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await uploadSensitiveFileToSlack({
          channelId: slackChannelId,
          buffer,
          fileName: `card_${userName}_${Date.now()}.${cardImage.type.split("/")[1] || "jpg"}`,
          title: "💳 신용카드 이미지",
          userName,
        });
      }
    }

    // 4. 텔레그램 알림 (민감 정보 마스킹)
    const telegramMessage = `
💳 <b>홈페이지 결제 대행 요청</b>

👤 이름: ${userName}
🏢 브랜드: ${brandName}
📚 기수: ${cohortName}
📞 연락처: ${user.연락처}

📋 <b>결제 정보</b>
• 아임웹 ID: ${imwebId}
• 결제 기준: ${paymentPeriod}
• 생년월일: ${birthDate}
${isNaverLogin ? "• 네이버 로그인 사용" : ""}

⚠️ 상세 정보는 슬랙 채널에서 확인해주세요.

───────────────────
📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
    `.trim();

    await sendTelegramMessage(telegramMessage);

    // 5. 커뮤니케이션 스레드 생성 (민감 정보 제외)
    const threadContent = `아임웹 결제 대행을 요청드립니다.

• 결제 기준: ${paymentPeriod}
• 아임웹 ID: ${imwebId}
${isNaverLogin ? "• 네이버 로그인 사용" : ""}

※ 카드 정보 및 비밀번호는 보안을 위해 슬랙으로 별도 전송되었습니다.`;

    const thread = await prisma.communicationThread.create({
      data: {
        userId,
        title: `[결제요청] 아임웹 ${paymentPeriod} 결제 대행`,
        category: "결제요청",
        messages: {
          create: {
            authorId: userId,
            authorType: "user",
            authorName: userName,
            content: threadContent,
            attachments: [], // 카드 이미지는 저장하지 않음
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({
      success: true,
      thread,
      message: "결제 대행 요청이 접수되었습니다. 카드 정보는 보안 채널로 전송되었습니다.",
    });
  } catch (error) {
    console.error("POST /api/communication/payment-request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
