// 제작요청 API
// Phase 5: Production API

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { submissionCompleteSchema } from "@/lib/schemas/submission.schema";
import { requestPrintSchema } from "@/lib/schemas/request-print.schema";
import { ZodError } from "zod";
import * as telegram from "@/lib/notification/telegramClient";
import * as slack from "@/lib/notification/slackClient";

/**
 * POST /api/submission/request-print
 *
 * 제작요청 처리:
 * 1. Submission 완료 여부 검증
 * 2. 선택된 인쇄물별로 Workflow 생성/업데이트
 * 3. Workflow 상태를 "시안중"으로 변경
 * 4. 텔레그램/슬랙 알림 발송
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id; // ✅ 타입 안전

    // 1. Submission 조회
    const submission = await prisma.submission.findUnique({
      where: { userId },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "제출 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. Submission 완료 여부 검증 (Zod)
    try {
      submissionCompleteSchema.parse(submission);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: "필수 항목을 모두 입력해주세요",
            details: error.errors,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // 3. 요청 본문 검증
    const body = await request.json();

    let validatedData;
    try {
      validatedData = requestPrintSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Invalid data", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { printTypes } = validatedData;

    // 4. 사용자 정보 조회 (알림용)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cohort: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 5. Workflow 생성/업데이트 (트랜잭션)
    const submitDate = new Date();
    const workflows = await prisma.$transaction(
      printTypes.map((type) =>
        prisma.workflow.upsert({
          where: {
            // composite unique key: userId + type
            userId_type: {
              userId,
              type,
            },
          },
          create: {
            userId,
            type,
            status: "시안중",
            자료제출일: submitDate,
          },
          update: {
            status: "시안중",
            자료제출일: submitDate,
          },
        })
      )
    );

    // 6. Submission isComplete 업데이트 (처음 제작요청 시)
    if (!submission.isComplete) {
      await prisma.submission.update({
        where: { userId },
        data: {
          isComplete: true,
          completedAt: new Date(),
        },
      });
    }

    // 7. 알림 발송 (비동기 - 실패해도 요청은 성공 처리)
    const cohortName = user.cohort?.name || "기수 미지정";
    const userName = user.이름;
    const brandName = submission.브랜드명 || "브랜드 미지정";

    // 7-1. 텔레그램 알림
    telegram
      .notifySubmissionComplete({
        cohortName,
        userName,
        brandName,
        userPhone: user.연락처,
        userEmail: user.email,
      })
      .catch((error) => {
        console.error("텔레그램 알림 실패:", error);
      });

    // 7-2. 슬랙 채널 생성 및 알림
    if (!user.slackChannelId) {
      slack
        .createSlackChannel({
          cohortName,
          userName,
          brandName,
          userEmail: user.email,
          userPhone: user.연락처,
        })
        .then((channelId) => {
          if (channelId) {
            // 슬랙 채널 ID 저장
            prisma.user
              .update({
                where: { id: userId },
                data: { slackChannelId: channelId },
              })
              .catch((error) => {
                console.error("슬랙 채널 ID 저장 실패:", error);
              });

            // 제출 데이터 푸시
            slack
              .pushSubmissionData({
                channelId,
                submissionData: submission,
              })
              .catch((error) => {
                console.error("슬랙 데이터 푸시 실패:", error);
              });
          }
        })
        .catch((error) => {
          console.error("슬랙 채널 생성 실패:", error);
        });
    } else {
      // 기존 슬랙 채널에 업데이트 알림
      slack
        .pushSubmissionData({
          channelId: user.slackChannelId,
          submissionData: submission,
        })
        .catch((error) => {
          console.error("슬랙 업데이트 알림 실패:", error);
        });
    }

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      message: `${printTypes.length}개 인쇄물 제작요청이 완료되었습니다.`,
      workflows: workflows.map((w) => ({
        id: w.id,
        type: w.type,
        status: w.status,
        자료제출일: w.자료제출일,
      })),
    });
  } catch (error) {
    console.error("POST /api/submission/request-print error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
