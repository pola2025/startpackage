import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// 외부 서비스 제작 스키마
const externalSchema = z.object({
  홈페이지제작방식: z.literal("외부서비스"),
  도메인주소: z.string().min(1, "도메인 주소를 입력해주세요"),
  도메인관리사이트: z.string().min(1, "도메인 관리 사이트를 선택해주세요"),
  도메인관리ID: z.string().min(1, "도메인 ID를 입력해주세요"),
  도메인관리PW: z.string().min(1, "도메인 비밀번호를 입력해주세요"),
  해외결제카드앞면URL: z.string().min(1, "카드 사진을 업로드해주세요"),
  해외결제카드뒷면URL: z.string().optional(),
  해외결제카드유효기간: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, "MM/YY 형식으로 입력해주세요"),
  해외결제카드CVC: z.string().regex(/^\d{3}$/, "CVC 번호는 3자리 숫자입니다"),
  홈페이지스타일: z.string().optional(),
  홈페이지컬러컨셉: z.string().optional(),
  GmailID: z.string().min(1, "Gmail ID를 입력해주세요"),
  GmailPW: z.string().min(1, "Gmail 비밀번호를 입력해주세요"),
});

// GET: 현재 사용자의 홈페이지 정보 조회
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submission = await prisma.submission.findUnique({
      where: { userId: session.user.id },
      select: {
        홈페이지제작방식: true,
        홈페이지스타일: true,
        홈페이지컬러컨셉: true,
        도메인주소: true,
        도메인관리사이트: true,
        도메인관리ID: true,
        도메인관리PW: true,
        해외결제카드앞면URL: true,
        해외결제카드뒷면URL: true,
        해외결제카드유효기간: true,
        해외결제카드CVC: true,
        GmailID: true,
        GmailPW: true,
      },
    });

    return NextResponse.json(submission || {});
  } catch (error) {
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

    // Submission이 없으면 생성, 있으면 업데이트
    const existingSubmission = await prisma.submission.findUnique({
      where: { userId: session.user.id },
    });

    // 업데이트 데이터 준비
    const updateData: Record<string, string | null> = {
      홈페이지제작방식: 홈페이지제작방식,
      홈페이지스타일: body.홈페이지스타일 || null,
      홈페이지컬러컨셉: body.홈페이지컬러컨셉 || null,
      GmailID: body.GmailID || null,
      GmailPW: body.GmailPW || null,
      도메인주소: body.도메인주소,
      도메인관리사이트: body.도메인관리사이트,
      도메인관리ID: body.도메인관리ID,
      도메인관리PW: body.도메인관리PW,
      해외결제카드앞면URL: body.해외결제카드앞면URL,
      해외결제카드뒷면URL: body.해외결제카드뒷면URL || null,
      해외결제카드유효기간: body.해외결제카드유효기간,
      해외결제카드CVC: body.해외결제카드CVC,
    };

    if (existingSubmission) {
      // 기존 데이터 업데이트
      await prisma.submission.update({
        where: { userId: session.user.id },
        data: updateData,
      });
    } else {
      // 새로 생성
      await prisma.submission.create({
        data: {
          userId: session.user.id,
          ...updateData,
        },
      });
    }

    // 슬랙/텔레그램 알림 발송
    try {
      // 사용자 정보 및 브랜드명 조회
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          cohort: { select: { name: true } },
          submission: { select: { 브랜드명: true } },
        },
      });

      const brandName = user?.submission?.브랜드명 || "미지정";

      // 스타일 이름 매핑 (미리보기 샘플 URL)
      const styleNames: Record<string, string> = {
        "https://www.jnipartners.co.kr": "스타일 1",
        "https://mjgood.imweb.me/": "스타일 2",
        "https://jmbiz.imweb.me/": "스타일 3",
        "https://ksupport-center.imweb.me/": "스타일 4",
        "https://www.wiztion.com/": "스타일 5",
        "https://fpbiz.imweb.me/": "스타일 6",
      };

      // 기존 자료제출 슬랙 채널 사용
      const { postMessage } = await import("@/lib/notification/slackClient");

      const channelId = user?.slackChannelId || null;

      if (channelId) {
        // 홈페이지 제작 상세 정보 메시지 발송
        let message = `📋 *홈페이지 제작 상세 정보*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `*제작 방식:* ${홈페이지제작방식}\n`;

        message += `\n*도메인 정보*\n`;
        message += `• 도메인 주소: ${body.도메인주소}\n`;
        message += `• 관리 사이트: ${body.도메인관리사이트}\n`;
        message += `• ID: ${body.도메인관리ID}\n`;
        message += `• PW: ${body.도메인관리PW}\n`;
        message += `• 카드 유효기간: ${body.해외결제카드유효기간}\n`;
        message += `• 카드 CVC: ${body.해외결제카드CVC}\n`;

        if (body.홈페이지스타일) {
          const styleName =
            styleNames[body.홈페이지스타일] || body.홈페이지스타일;
          message += `\n*스타일 선택*\n`;
          message += `• 선택 스타일: ${styleName}\n`;
          message += `• 참고 URL: ${body.홈페이지스타일}\n`;
        }

        if (body.홈페이지컬러컨셉) {
          message += `• 컬러 컨셉: ${body.홈페이지컬러컨셉}\n`;
        }

        await postMessage({
          channelId,
          text: message,
        });
        console.log(
          `✅ [Homepage] 슬랙 채널 생성 및 알림 발송 완료: ${user?.이름}`,
        );
      }

      // 텔레그램 알림 (HTML 형식)
      const { sendTelegramMessage } =
        await import("@/lib/notification/telegramClient");

      let telegramMsg = `🌐 <b>홈페이지 제작 요청</b>\n`;
      telegramMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
      telegramMsg += `👤 ${user?.이름 || "알 수 없음"}`;
      if (user?.cohort?.name) {
        telegramMsg += ` (${user.cohort.name})`;
      }
      telegramMsg += `\n🏢 브랜드: ${brandName}`;
      telegramMsg += `\n📋 제작 방식: ${홈페이지제작방식}\n`;
      telegramMsg += `\n🌍 도메인: ${body.도메인관리사이트}\n`;

      if (body.홈페이지스타일) {
        telegramMsg += `🎨 스타일: ${styleNames[body.홈페이지스타일] || "선택됨"}\n`;
      }

      await sendTelegramMessage(telegramMsg);
      console.log(`✅ [Homepage] 텔레그램 알림 발송 완료`);
    } catch (notifyError) {
      console.error("알림 발송 실패:", notifyError);
      // 알림 실패해도 저장은 성공으로 처리
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save homepage info:", error);
    return NextResponse.json(
      { error: "Failed to save homepage info" },
      { status: 500 },
    );
  }
}
