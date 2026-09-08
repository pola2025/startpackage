import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { sendConsentChangeNotification } from "@/lib/notification/consentChange";

// PATCH: 사용자 설정 업데이트
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      공지사항이메일수신,
      콘텐츠팁이메일수신,
      SMS수신동의,
      이메일수신동의,
    } = body;

    if (isD1RuntimeEnabled()) {
      const before = await callDataService<Record<string, unknown> | null>("content-domain/settings-before", { userId });
      const user = await callDataService<Record<string, unknown>>("content-domain/settings-update", {
        userId,
        changes: {
          공지사항이메일수신,
          콘텐츠팁이메일수신,
          SMS수신동의,
          이메일수신동의,
        },
      });
      await sendConsentChangeNotification(before ?? {}, {
        SMS수신동의: typeof SMS수신동의 === "boolean" ? SMS수신동의 : undefined,
        이메일수신동의: typeof 이메일수신동의 === "boolean" ? 이메일수신동의 : undefined,
      }).catch((error) => console.error("수신동의 변경 슬랙 알림 실패:", error));
      return NextResponse.json({ success: true, user });
    }

    // 변경 전 값 조회 (이력용)
    const before = (await prisma.user.findUnique({
      where: { id: userId },
      select: {
        SMS수신동의: true,
        이메일수신동의: true,
        slackChannelId: true,
      },
    })) ?? { SMS수신동의: false, 이메일수신동의: false, slackChannelId: null };

    // 사용자 설정 업데이트
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(공지사항이메일수신 !== undefined && { 공지사항이메일수신 }),
        ...(콘텐츠팁이메일수신 !== undefined && { 콘텐츠팁이메일수신 }),
        ...(SMS수신동의 !== undefined && { SMS수신동의 }),
        ...(이메일수신동의 !== undefined && { 이메일수신동의 }),
      },
    });

    await sendConsentChangeNotification(before, {
      SMS수신동의: typeof SMS수신동의 === "boolean" ? SMS수신동의 : undefined,
      이메일수신동의: typeof 이메일수신동의 === "boolean" ? 이메일수신동의 : undefined,
    }).catch((err) => console.error("수신동의 변경 슬랙 알림 실패:", err));

    return NextResponse.json({
      success: true,
      user: {
        공지사항이메일수신: user.공지사항이메일수신,
        콘텐츠팁이메일수신: user.콘텐츠팁이메일수신,
        SMS수신동의: user.SMS수신동의,
        이메일수신동의: user.이메일수신동의,
      },
    });

  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("PATCH /api/user/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
