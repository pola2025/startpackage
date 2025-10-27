import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleSubmissionComplete } from "@/lib/notification/notificationService";
import { calculateDesignDeadline, calculateWebsiteDeadline } from "@/lib/utils/dateCalculator";
import { submissionPartialSchema } from "@/lib/schemas/submission.schema";
import { ZodError } from "zod";

// GET: 사용자 제출 데이터 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id; // ✅ 타입 안전

    // Submission 조회 또는 생성
    let submission = await prisma.submission.findUnique({
      where: { userId },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: { userId },
      });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("GET /api/submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 제출 데이터 업데이트
export async function POST(request: Request) {
  try {
    console.log("🔄 [Submission] POST 요청 시작");

    const session = await auth();
    if (!session?.user) {
      console.error("❌ [Submission] Unauthorized - 세션 없음");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id; // ✅ 타입 안전
    console.log(`✅ [Submission] 사용자 인증 성공: userId=${userId}`);

    const body = await request.json();
    console.log("📋 [Submission] Request body:", JSON.stringify(body, null, 2));

    // ✅ Zod 검증
    let validatedData;
    try {
      validatedData = submissionPartialSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Zod validation error:", error.errors);
        console.error("Request body:", body);
        return NextResponse.json(
          { error: "Invalid data", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // 기존 submission 상태 확인 (제작요청 처리 전에 체크하기 위함)
    const existingSubmission = await prisma.submission.findUnique({
      where: { userId },
    });
    const wasNotComplete = !existingSubmission?.isComplete;

    // Submission 업데이트
    const submission = await prisma.submission.upsert({
      where: { userId },
      create: {
        userId,
        ...validatedData,
      },
      update: validatedData,
    });

    // 사용자 정보 조회 (슬랙 채널 ID 확인용)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // 로고 정보가 저장되면 로고 워크플로우 자동 생성
    if (validatedData.로고선호스타일 || validatedData.로고선호폰트 || validatedData.명함색상) {
      const existingLogoWorkflow = await prisma.workflow.findFirst({
        where: {
          userId,
          type: "로고",
        },
      });

      if (!existingLogoWorkflow) {
        console.log(`✅ 로고 워크플로우 생성: userId=${userId}`);
        await prisma.workflow.create({
          data: {
            userId,
            type: "로고",
            status: "시안제작중",
            자료제출일: new Date(),
          },
        });
        console.log(`✅ 로고 워크플로우 생성 완료`);
      }
    }

    // 홈페이지 정보가 저장되면 홈페이지 워크플로우 자동 생성 및 슬랙 알림
    if (validatedData.홈페이지스타일 || validatedData.홈페이지컬러컨셉) {
      const existingWebsiteWorkflow = await prisma.workflow.findFirst({
        where: {
          userId,
          type: "홈페이지",
        },
      });

      // 영업일 기준 7일 후 제작 완료 예정일 계산
      const websiteDeadline = calculateWebsiteDeadline(new Date());
      const deadlineString = websiteDeadline.toISOString().split('T')[0]; // "YYYY-MM-DD" 형식

      if (!existingWebsiteWorkflow) {
        console.log(`✅ 홈페이지 워크플로우 생성: userId=${userId}`);

        await prisma.workflow.create({
          data: {
            userId,
            type: "홈페이지",
            status: "제작 진행 중",
            자료제출일: new Date(),
            예상도착일: deadlineString,
          },
        });
        console.log(`✅ 홈페이지 워크플로우 생성 완료 (예상 완료일: ${deadlineString})`);
      } else if (!existingWebsiteWorkflow.예상도착일 || existingWebsiteWorkflow.status === "시안중") {
        // 기존 워크플로우에 예정일이 없거나 상태가 잘못된 경우 업데이트
        console.log(`✅ 홈페이지 워크플로우 업데이트: userId=${userId}`);
        await prisma.workflow.update({
          where: { id: existingWebsiteWorkflow.id },
          data: {
            예상도착일: deadlineString,
            status: "제작 진행 중",
          },
        });
        console.log(`✅ 홈페이지 워크플로우 업데이트 완료 (예상 완료일: ${deadlineString})`);
      }

      // 홈페이지 스타일+컬러 선택 시 슬랙 알림
      if ((validatedData.홈페이지스타일 || validatedData.홈페이지컬러컨셉) && user?.slackChannelId) {
        const { postMessage } = await import("@/lib/notification/slackClient");

        const styleNames: Record<string, string> = {
          "https://financialhealing.imweb.me/": "스타일 1",
          "https://primeroad.imweb.me/": "스타일 2",
          "https://ynjbiz.imweb.me/": "스타일 3",
          "https://mjgood.imweb.me/": "스타일 4",
          "https://jmbiz.imweb.me/": "스타일 5",
          "https://ganaanbiz.imweb.me/": "스타일 6",
          "https://ksupport-center.imweb.me/": "스타일 7",
          "https://financeable.imweb.me/": "스타일 8",
        };

        const styleName = submission.홈페이지스타일 ? styleNames[submission.홈페이지스타일] || submission.홈페이지스타일 : "-";
        const color = submission.홈페이지컬러컨셉 || "-";

        await postMessage({
          channelId: user.slackChannelId,
          text: `✅ 홈페이지 스타일 & 컬러 선택`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*✅ 홈페이지 스타일 & 컬러 선택*\n\n*선택한 스타일:* ${styleName}\n*컬러 컨셉:* ${color}`,
              },
            },
            submission.홈페이지스타일 ? {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<${submission.홈페이지스타일}|스타일 보기>`,
              },
            } : null,
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ].filter(Boolean) as any,
        }).catch(err => console.error("홈페이지 선택 슬랙 알림 실패", err));
      }
    }

    // 슬랙 채널이 있으면 변경된 파일과 명함시안 정보를 슬랙에 전송
    console.log(`🔍 [Submission] 슬랙 업데이트 체크 - slackChannelId: ${user?.slackChannelId}, existingSubmission: ${!!existingSubmission}`);
    if (user?.slackChannelId && existingSubmission) {
      console.log(`✅ [Submission] 슬랙 업데이트 시작`);
      const { uploadFileToSlack } = await import("@/lib/notification/slackClient");
      const { postMessage } = await import("@/lib/notification/slackClient");

      // 텍스트 필드 변경 감지
      const textFields: Array<{ key: keyof typeof submission; label: string }> = [
        { key: "브랜드명", label: "브랜드명" },
        { key: "업종", label: "업종" },
        { key: "주소", label: "주소" },
        { key: "대표번호", label: "대표번호" },
        { key: "이메일", label: "이메일" },
        { key: "로고선호스타일", label: "로고 선호 스타일" },
        { key: "로고선호폰트", label: "로고 선호 폰트" },
        { key: "명함색상", label: "명함 색상" },
      ];

      const changedTextFields: Array<{ label: string; oldValue: any; newValue: any }> = [];

      for (const { key, label } of textFields) {
        const newValue = submission[key];
        const oldValue = existingSubmission[key];

        if (newValue && newValue !== oldValue && oldValue !== null) {
          changedTextFields.push({ label, oldValue, newValue });
          console.log(`📝 [Submission] 텍스트 필드 변경: ${label} - ${oldValue} → ${newValue}`);
        }
      }

      // 변경된 텍스트 필드가 있으면 슬랙에 메시지 전송
      if (changedTextFields.length > 0) {
        const fields = changedTextFields.map(({ label, oldValue, newValue }) => ({
          type: "mrkdwn",
          text: `*${label}:*\n~${oldValue}~ → *${newValue}*`,
        }));

        await postMessage({
          channelId: user.slackChannelId,
          text: `📝 정보 수정`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "📝 정보 수정됨",
              },
            },
            {
              type: "section",
              fields,
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ],
        }).catch(err => console.error("정보 수정 슬랙 메시지 전송 실패", err));
      }

      // 파일 필드 체크 (마케팅 서류 등)
      const fileFields = [
        { key: "대표자신분증URL", label: "대표자신분증", fileName: "대표자신분증.jpg" },
        { key: "통신서비스이용증명원URL", label: "통신서비스이용증명원", fileName: "통신서비스이용증명원.pdf" },
        { key: "신용카드앞면URL", label: "신용카드앞면", fileName: "신용카드앞면.jpg" },
        { key: "로고예시디자인URL", label: "로고예시디자인", fileName: "로고예시디자인.jpg" },
      ] as const;

      // 변경된 파일 업로드
      for (const { key, label, fileName } of fileFields) {
        const newValue = submission[key];
        const oldValue = existingSubmission[key];

        if (newValue && newValue !== oldValue) {
          console.log(`📤 [Submission] 파일 업로드: ${label}`);
          await uploadFileToSlack({
            channelId: user.slackChannelId,
            filePath: newValue,
            fileName,
            title: label,
          }).catch(err => console.error(`파일 업로드 실패: ${label}`, err));

          // 텔레그램 알림 발송
          const { sendTelegramMessage } = await import("@/lib/notification/telegramClient");
          await sendTelegramMessage(
            `📤 *파일 업로드*\n\n*사용자:* ${user.이름 || user.email}\n*파일:* ${label}\n*시간:* ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`
          ).catch(err => console.error("텔레그램 알림 실패:", err));
        }
      }

      // 명함시안 변경 체크
      if (submission.명함시안 && submission.명함시안 !== existingSubmission.명함시안) {
        console.log(`📝 명함 스타일 선택: ${submission.명함시안}`);

        // 슬랙에 메시지 전송
        await postMessage({
          channelId: user.slackChannelId,
          text: `✅ 명함 스타일 선택: ${submission.명함시안}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*✅ 명함 스타일 선택*\n선택한 스타일: *${submission.명함시안}*`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
                },
              ],
            },
          ],
        }).catch(err => console.error("명함 스타일 메시지 전송 실패", err));

        // 명함 워크플로우에 스타일 정보 기록 (메모 필드 활용)
        await prisma.workflow.updateMany({
          where: {
            userId,
            type: "명함",
          },
          data: {
            // 추후 메모 필드 추가 가능
          },
        }).catch(err => console.error("워크플로우 업데이트 실패", err));
      }
    }

    // 사용자가 명시적으로 isComplete: true를 보낸 경우만 제작요청 처리
    if (validatedData.isComplete === true && wasNotComplete) {
      console.log(`🎯 제작요청 시작: userId=${userId}`);
      // 필수 항목 확인
      const requiredFields = [
        "브랜드명",
        "업종",
        "주소",
        "사업자등록증URL",
        "프로필사진URL",
        "명함시안",
      ];

      const missingFields = requiredFields.filter((field) => !submission[field as keyof typeof submission]);

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: "필수 항목을 모두 입력해주세요", missingFields },
          { status: 400 }
        );
      }

      // 시안 예정일 계산 (평일 기준 3일)
      const designDeadline = calculateDesignDeadline(new Date());

      // 완료 상태 업데이트
      const updatedSubmission = await prisma.submission.update({
        where: { userId },
        data: {
          isComplete: true,
          completedAt: new Date(),
          시안예정일: designDeadline,
        },
      });

      // 사용자 정보 조회 (기수명, 이름 등)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { cohort: true },
      });

      if (user) {
        // 워크플로우 확인 및 생성/업데이트
        const existingWorkflows = await prisma.workflow.findMany({
          where: { userId },
        });

        if (existingWorkflows.length === 0) {
          // 워크플로우가 없으면 새로 생성 (시안중 상태로)
          console.log(`✅ 워크플로우 생성 중: userId=${userId}`);
          await prisma.workflow.createMany({
            data: [
              { userId, type: "명함", status: "시안중", 자료제출일: new Date() },
              { userId, type: "명찰", status: "시안중", 자료제출일: new Date() },
              { userId, type: "대봉투", status: "시안중", 자료제출일: new Date() },
              { userId, type: "자문계약서 표지", status: "시안중", 자료제출일: new Date() },
              { userId, type: "자문계약서 내지", status: "시안중", 자료제출일: new Date() },
            ],
          });
          console.log(`✅ 워크플로우 5개 생성 완료`);
        } else {
          // 워크플로우가 있으면 상태만 업데이트
          console.log(`✅ 워크플로우 업데이트 중: ${existingWorkflows.length}개`);
          await prisma.workflow.updateMany({
            where: { userId },
            data: {
              status: "시안중",
              자료제출일: new Date(),
            },
          });
          console.log(`✅ 워크플로우 업데이트 완료`);
        }

        // 슬랙 채널명 생성을 위한 이름 (한글 자동 변환)
        const cohortName = user.cohort?.englishName || user.cohort?.name || "unknown";
        const userName = user.englishName || user.이름; // 한글이면 자동 변환됨
        const brandName = updatedSubmission.brandNameEnglish || updatedSubmission.브랜드명 || "unknown"; // 한글이면 자동 변환됨

        console.log(`🔍 [Submission] 슬랙 채널명 생성 정보:`);
        console.log(`  - cohortName: ${cohortName} (원본: ${user.cohort?.name})`);
        console.log(`  - userName: ${userName} (한글: ${user.이름})`);
        console.log(`  - brandName: ${brandName} (한글: ${updatedSubmission.브랜드명})`);

        // 알림 발송 (텔레그램 + 슬랙)
        await handleSubmissionComplete({
          userId,
          cohortName,
          userName,
          brandName,
          userEmail: user.email,
          userPhone: user.연락처,
          submissionData: updatedSubmission,
        }).catch((error) => {
          console.error("알림 발송 실패:", error);
          // 알림 실패는 무시하고 계속 진행
        });
      }

      return NextResponse.json(updatedSubmission);
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("POST /api/submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
