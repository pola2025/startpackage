import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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

    // 변경 전 값 조회 (이력용)
    const before = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        SMS수신동의: true,
        이메일수신동의: true,
        slackChannelId: true,
      },
    });

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

    // 수신동의 변경 시 슬랙 이력 기록
    if (before?.slackChannelId) {
      const changed: string[] = [];
      if (SMS수신동의 !== undefined && SMS수신동의 !== before.SMS수신동의) {
        changed.push(
          `SMS 수신동의: ${before.SMS수신동의 ? "동의" : "미동의"} → *${SMS수신동의 ? "동의" : "미동의"}*`,
        );
      }
      if (
        이메일수신동의 !== undefined &&
        이메일수신동의 !== before.이메일수신동의
      ) {
        changed.push(
          `이메일 수신동의: ${before.이메일수신동의 ? "동의" : "미동의"} → *${이메일수신동의 ? "동의" : "미동의"}*`,
        );
      }

      if (changed.length > 0) {
        const { postMessage } = await import("@/lib/notification/slackClient");
        const now = new Date().toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
        });
        await postMessage({
          channelId: before.slackChannelId,
          text: `⚙️ 수신동의 설정 변경`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*⚙️ 수신동의 설정 변경*\n${changed.join("\n")}`,
              },
            },
            {
              type: "context",
              elements: [{ type: "mrkdwn", text: `📅 ${now}` }],
            },
          ],
        }).catch((err) => console.error("수신동의 변경 슬랙 알림 실패:", err));
      }
    }

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
    console.error("PATCH /api/user/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
