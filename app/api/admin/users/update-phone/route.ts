import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// 전화번호 검증 스키마
const updatePhoneSchema = z.object({
  userId: z.string().cuid(),
  연락처: z
    .string()
    .regex(
      /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
      "올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)",
    ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentUserId = session?.user?.id;

    // 로그인 확인
    if (!session || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // 입력 검증
    const validation = updatePhoneSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.errors[0].message,
        },
        { status: 400 },
      );
    }

    const { userId, 연락처 } = validation.data;

    // 권한 확인: 관리자이거나 본인만 수정 가능
    const isAdmin = ["super", "designer", "operator"].includes(userRole);
    const isSelf = currentUserId === userId;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "본인의 전화번호만 수정할 수 있습니다" },
        { status: 403 },
      );
    }

    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        이름: true,
        연락처: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 전화번호 정규화 (하이픈 제거)
    const cleanPhone = 연락처.replace(/-/g, "");
    // 하이픈 포함 형식도 생성 (중복 확인용)
    const formattedPhone = cleanPhone.replace(
      /(\d{3})(\d{3,4})(\d{4})/,
      "$1-$2-$3",
    );

    // 전화번호 중복 확인 (자기 자신 제외, 양쪽 형식 모두 검색)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ 연락처: cleanPhone }, { 연락처: formattedPhone }],
        NOT: {
          id: userId,
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 전화번호입니다" },
        { status: 400 },
      );
    }

    // 전화번호 업데이트 (비밀번호는 그대로 유지)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 연락처: cleanPhone },
      select: {
        id: true,
        이름: true,
        연락처: true,
        email: true,
        slackChannelId: true,
      },
    });

    // 슬랙 채널에 수정이력 기록
    if (updatedUser.slackChannelId) {
      const { postMessage } = await import("@/lib/notification/slackClient");
      const oldPhone = user.연락처 || "없음";
      const now = new Date().toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
      });

      await postMessage({
        channelId: updatedUser.slackChannelId,
        text: `📱 연락처 변경`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📱 연락처 변경*\n~${oldPhone}~ → *${cleanPhone}*`,
            },
          },
          {
            type: "context",
            elements: [{ type: "mrkdwn", text: `📅 ${now}` }],
          },
        ],
      }).catch((err) => console.error("연락처 변경 슬랙 알림 실패:", err));
    }

    return NextResponse.json({
      success: true,
      message: `${user.이름}님의 전화번호가 ${cleanPhone}로 변경되었습니다`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("POST /api/admin/users/update-phone error:", error);
    return NextResponse.json(
      { error: "전화번호 수정 중 오류가 발생했습니다" },
      { status: 500 },
    );
  }
}
