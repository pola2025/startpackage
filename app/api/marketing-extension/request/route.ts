import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  ONLINE_MARKETING_BILLING_WEEKS,
  ONLINE_MARKETING_BILLING_DAYS,
  ONLINE_MARKETING_TOTAL_PRICE,
} from "@/lib/marketing-pricing";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

// POST: 마케팅 지원 연장 신청
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { requestMessage } = body;

    if (isD1RuntimeEnabled()) {
      const extensionRequest = await callDataService<{ success: boolean; id: string; currentEndDate: number; newEndDate: number; requestMessage: string; userName?: string; email?: string }>("content-domain/marketing-extension-request", {
        userId,
        requestMessage: typeof requestMessage === "string" ? requestMessage : "",
      });
      try {
        const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
        await sendTelegramMessage(
          `🔔 *마케팅 지원 연장 신청*\n\n` +
            `*신청자:* ${extensionRequest.userName ?? "알 수 없음"} (${extensionRequest.email ?? ""})\n` +
            `*연장 기간:* ${ONLINE_MARKETING_BILLING_WEEKS}주\n` +
            `*결제 금액:* ${ONLINE_MARKETING_TOTAL_PRICE.toLocaleString()}원 (VAT 포함)\n` +
            `*현재 종료일:* ${new Date(extensionRequest.currentEndDate).toLocaleDateString("ko-KR")}\n` +
            `*연장 종료일:* ${new Date(extensionRequest.newEndDate).toLocaleDateString("ko-KR")}\n` +
            `*요청 메시지:* ${extensionRequest.requestMessage || "(없음)"}`,
        );
      } catch (error) {
        console.error("텔레그램 알림 실패:", error);
      }
      return NextResponse.json({ success: true, extensionRequest });
    }

    const selectedPrice = {
      total: ONLINE_MARKETING_TOTAL_PRICE,
    };

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        marketingSupportEnabled: true,
        marketingSupportEndDate: true,
        이름: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    if (!user.marketingSupportEnabled || !user.marketingSupportEndDate) {
      return NextResponse.json(
        { error: "마케팅 지원이 활성화되지 않았습니다" },
        { status: 400 },
      );
    }

    const currentEndDate = new Date(user.marketingSupportEndDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + ONLINE_MARKETING_BILLING_DAYS);

    // 이미 pending 상태의 신청이 있는지 확인
    const existingRequest = await prisma.marketingExtensionRequest.findFirst({
      where: {
        userId,
        status: "pending",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "이미 처리 대기 중인 연장 신청이 있습니다" },
        { status: 400 },
      );
    }

    // 연장 신청 생성
    const extensionRequest = await prisma.marketingExtensionRequest.create({
      data: {
        userId,
        currentEndDate,
        newEndDate,
        requestMessage: requestMessage || "",
      },
    });

    // 관리자에게 텔레그램 알림
    try {
      const { sendTelegramMessage } =
        await import("@/lib/notification/telegramClient");
      await sendTelegramMessage(
        `🔔 *마케팅 지원 연장 신청*\n\n` +
          `*신청자:* ${user.이름} (${user.email})\n` +
          `*연장 기간:* ${ONLINE_MARKETING_BILLING_WEEKS}주\n` +
          `*결제 금액:* ${selectedPrice.total.toLocaleString()}원 (VAT 포함)\n` +
          `*현재 종료일:* ${currentEndDate.toLocaleDateString("ko-KR")}\n` +
          `*연장 종료일:* ${newEndDate.toLocaleDateString("ko-KR")}\n` +
          `*요청 메시지:* ${requestMessage || "(없음)"}`,
      );
    } catch (error) {
      console.error("텔레그램 알림 실패:", error);
    }

    return NextResponse.json({
      success: true,
      extensionRequest,
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("POST /api/marketing-extension/request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
