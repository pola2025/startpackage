import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleSubmissionComplete } from "@/lib/notification/notificationService";
import {
  calculateDesignDeadline,
  calculateWebsiteDeadline,
} from "@/lib/utils/dateCalculator";
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
      { status: 500 },
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

      // ✅ 빈 문자열 처리: null로 변환하거나 제거
      const filteredData: any = {};
      for (const [key, value] of Object.entries(validatedData)) {
        if (value === null || value === undefined) {
          // null/undefined는 제외 (업데이트 안 함)
          continue;
        } else if (value === "") {
          // 빈 문자열 → null로 변환 (명시적 삭제)
          filteredData[key] = null;
        } else {
          // 값이 있으면 그대로 사용
          filteredData[key] = value;
        }
      }
      validatedData = filteredData;

      console.log(
        "📝 [Submission] 필터링된 데이터:",
        JSON.stringify(validatedData, null, 2),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Zod validation error:", error.errors);
        console.error("Request body:", body);
        return NextResponse.json(
          { error: "Invalid data", details: error.errors },
          { status: 400 },
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
      include: { cohort: true },
    });

    // 자료제출 시 로고 워크플로우 자동 생성 (없으면 생성)
    const existingLogoWorkflow = await prisma.workflow.findFirst({
      where: { userId, type: "로고" },
    });

    if (!existingLogoWorkflow) {
      console.log(`✅ 로고 워크플로우 생성: userId=${userId}`);
      await prisma.workflow.create({
        data: {
          userId,
          type: "로고",
          status: "대기",
          isDraft: true,
          draftSavedAt: new Date(),
        },
      });
      console.log(`✅ 로고 워크플로우 생성 완료`);
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
      const deadlineString = websiteDeadline.toISOString().split("T")[0]; // "YYYY-MM-DD" 형식

      if (!existingWebsiteWorkflow) {
        console.log(`✅ 홈페이지 워크플로우 생성: userId=${userId}`);

        await prisma.workflow.create({
          data: {
            userId,
            type: "홈페이지",
            status: "제작 진행 중",
            자료제출일: new Date(),
            예상도착일: deadlineString,
            isDraft: false, // 스타일/컬러 선택 시 최종저장
          },
        });
        console.log(
          `✅ 홈페이지 워크플로우 생성 완료 (예상 완료일: ${deadlineString})`,
        );
      } else if (
        !existingWebsiteWorkflow.예상도착일 ||
        existingWebsiteWorkflow.status === "시안중"
      ) {
        // 기존 워크플로우에 예정일이 없거나 상태가 잘못된 경우 업데이트
        console.log(`✅ 홈페이지 워크플로우 업데이트: userId=${userId}`);
        await prisma.workflow.update({
          where: { id: existingWebsiteWorkflow.id },
          data: {
            예상도착일: deadlineString,
            status: "제작 진행 중",
            isDraft: false, // 스타일/컬러 선택 시 최종저장
          },
        });
        console.log(
          `✅ 홈페이지 워크플로우 업데이트 완료 (예상 완료일: ${deadlineString})`,
        );
      }

      // 홈페이지 스타일+컬러 선택 시 슬랙 알림
      if (
        (validatedData.홈페이지스타일 || validatedData.홈페이지컬러컨셉) &&
        user?.slackChannelId
      ) {
        const { postMessage } = await import("@/lib/notification/slackClient");

        const styleNames: Record<string, string> = {
          "https://www.jnipartners.co.kr": "스타일 1",
          "https://mjgood.imweb.me/": "스타일 2",
          "https://jmbiz.imweb.me/": "스타일 3",
          "https://ksupport-center.imweb.me/": "스타일 4",
          "https://www.wiztion.com/": "스타일 5",
          "https://fpbiz.imweb.me/": "스타일 6",
        };

        const styleName = submission.홈페이지스타일
          ? styleNames[submission.홈페이지스타일] || submission.홈페이지스타일
          : "-";
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
            submission.홈페이지스타일
              ? {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `<${submission.홈페이지스타일}|스타일 보기>`,
                  },
                }
              : null,
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
        }).catch((err) => console.error("홈페이지 선택 슬랙 알림 실패", err));
      }
    }

    // 슬랙 채널 생성 또는 업데이트
    console.log(
      `🔍 [Submission] 슬랙 체크 - slackChannelId: ${user?.slackChannelId}`,
    );

    // 슬랙 채널이 없으면 생성 (기본 정보 완료 시)
    if (
      user &&
      !user.slackChannelId &&
      submission.브랜드명 &&
      submission.업종 &&
      submission.주소
    ) {
      console.log(`🔄 [Submission] 슬랙 채널 생성 시작 (제출 정보 있음)`);
      const { createSlackChannel } =
        await import("@/lib/notification/slackClient");

      const cohortName =
        user.cohort?.englishName || user.cohort?.name || "unknown";
      const userName = user.englishName || user.이름;
      const brandName =
        submission.brandNameEnglish || submission.브랜드명 || "unknown";

      const slackChannelId = await createSlackChannel({
        cohortName,
        userName,
        brandName,
        userEmail: user.email,
        userPhone: user.연락처,
      });

      if (slackChannelId) {
        // DB에 슬랙 채널 ID 저장
        await prisma.user.update({
          where: { id: userId },
          data: { slackChannelId },
        });
        console.log(`✅ [Submission] 슬랙 채널 생성 완료: ${slackChannelId}`);

        // 초기 제출 정보 푸시
        const { pushSubmissionData } =
          await import("@/lib/notification/slackClient");
        await pushSubmissionData({
          channelId: slackChannelId,
          submissionData: submission,
        });

        // user 객체 업데이트 (이후 로직에서 사용)
        user.slackChannelId = slackChannelId;
      }
    }

    // 슬랙 채널이 있으면 변경사항 업데이트
    if (user?.slackChannelId && existingSubmission) {
      console.log(`✅ [Submission] 슬랙 업데이트 시작`);
      const { uploadFileToSlack } =
        await import("@/lib/notification/slackClient");
      const { postMessage } = await import("@/lib/notification/slackClient");

      // 텍스트 필드 변경 감지
      const textFields: Array<{ key: keyof typeof submission; label: string }> =
        [
          { key: "브랜드명", label: "브랜드명" },
          { key: "업종", label: "업종" },
          { key: "주소", label: "주소" },
          { key: "인쇄물받을주소", label: "배송받을곳 주소" },
          { key: "대표번호", label: "대표번호" },
          { key: "이메일", label: "이메일" },
          { key: "로고선호스타일", label: "로고 선호 스타일" },
          { key: "로고선호폰트", label: "로고 선호 폰트" },
          { key: "명함색상", label: "로고/명함 색상" },
          { key: "명함시안", label: "명함 스타일" },
          { key: "계약서시안", label: "계약서 스타일" },
          { key: "메타광고관리자값", label: "Meta 광고 관리자 값" },
          { key: "네이버검색광고ID", label: "네이버 검색광고 ID" },
          { key: "네이버검색광고PW", label: "네이버 검색광고 비밀번호" },
          { key: "네이버클라우드ID", label: "네이버 클라우드 ID" },
          { key: "네이버클라우드PW", label: "네이버 클라우드 비밀번호" },
          { key: "InstagramID", label: "Instagram ID" },
          { key: "InstagramPW", label: "Instagram 비밀번호" },
          { key: "GmailID", label: "Gmail ID" },
          { key: "GmailPW", label: "Gmail 비밀번호" },
          { key: "홈페이지스타일", label: "홈페이지 스타일" },
          { key: "홈페이지컬러컨셉", label: "홈페이지 컬러" },
          { key: "아임웹ID", label: "아임웹 ID" },
          { key: "아임웹PW", label: "아임웹 비밀번호" },
          { key: "아임웹관리자PW", label: "아임웹 관리자 비밀번호" },
        ];

      const changedTextFields: Array<{
        label: string;
        oldValue: any;
        newValue: any;
        isNew: boolean;
      }> = [];

      for (const { key, label } of textFields) {
        const newValue = submission[key];
        const oldValue = existingSubmission[key];

        // 새로 추가된 경우 (oldValue가 null/undefined) 또는 변경된 경우
        if (newValue && newValue !== oldValue) {
          const isNew = !oldValue;
          changedTextFields.push({ label, oldValue, newValue, isNew });
          console.log(
            `📝 [Submission] 텍스트 필드 ${isNew ? "추가" : "변경"}: ${label} - ${oldValue || "없음"} → ${newValue}`,
          );
        }
      }

      // 배송지 변경 감지 (우선순위 높음)
      const deliveryAddressChanged = changedTextFields.find(
        (f) => f.label === "배송받을곳 주소",
      );

      // 배송지 변경 시 별도 강조 메시지
      if (deliveryAddressChanged) {
        await postMessage({
          channelId: user.slackChannelId,
          text: "🚚 배송지 정보 변경됨",
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "🚚 배송지 정보 변경됨",
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: deliveryAddressChanged.isNew
                  ? `*새로운 배송지 주소:*\n✨ *${deliveryAddressChanged.newValue}*`
                  : `*배송지 주소 변경:*\n~${deliveryAddressChanged.oldValue}~ → *${deliveryAddressChanged.newValue}*`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `⚠️ 배송지가 변경되었습니다. 인쇄물 발주 시 확인 필요`,
                },
              ],
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
        }).catch((err) =>
          console.error("배송지 변경 슬랙 메시지 전송 실패", err),
        );
      }

      // 변경된 텍스트 필드가 있으면 슬랙에 메시지 전송
      if (changedTextFields.length > 0) {
        const fields = changedTextFields.map(
          ({ label, oldValue, newValue, isNew }) => ({
            type: "mrkdwn",
            text: isNew
              ? `*${label}:*\n✨ *${newValue}* (새로 추가됨)`
              : `*${label}:*\n~${oldValue}~ → *${newValue}*`,
          }),
        );

        const hasNewFields = changedTextFields.some((f) => f.isNew);
        const hasUpdatedFields = changedTextFields.some((f) => !f.isNew);

        let headerText = "📝 정보 업데이트";
        if (hasNewFields && !hasUpdatedFields) {
          headerText = "✨ 새로운 정보 추가됨";
        } else if (hasNewFields && hasUpdatedFields) {
          headerText = "📝 정보 추가 및 수정";
        }

        await postMessage({
          channelId: user.slackChannelId,
          text: headerText,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: headerText,
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
        }).catch((err) =>
          console.error("정보 수정 슬랙 메시지 전송 실패", err),
        );
      }

      // 파일 필드 체크 (모든 업로드 파일)
      const fileFields = [
        {
          key: "사업자등록증URL",
          label: "사업자등록증",
          fileName: "사업자등록증.pdf",
        },
        {
          key: "프로필사진URL",
          label: "프로필사진",
          fileName: "프로필사진.jpg",
        },
        { key: "로고URL", label: "로고 파일", fileName: "로고.png" },
        {
          key: "대표자신분증URL",
          label: "대표자신분증",
          fileName: "대표자신분증.jpg",
        },
        {
          key: "통신서비스이용증명원URL",
          label: "통신서비스이용증명원",
          fileName: "통신서비스이용증명원.pdf",
        },
        {
          key: "신용카드앞면URL",
          label: "신용카드앞면",
          fileName: "신용카드앞면.jpg",
        },
        {
          key: "로고예시디자인URL",
          label: "로고예시디자인",
          fileName: "로고예시디자인.jpg",
        },
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
          }).catch((err) => console.error(`파일 업로드 실패: ${label}`, err));

          // 텔레그램 알림 발송
          const { sendTelegramMessage } =
            await import("@/lib/notification/telegramClient");
          await sendTelegramMessage(
            `📤 *파일 업로드*\n\n*사용자:* ${user.이름 || user.email}\n*파일:* ${label}\n*시간:* ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
          ).catch((err) => console.error("텔레그램 알림 실패:", err));
        }
      }

      // 명함시안 변경 체크
      if (
        submission.명함시안 &&
        submission.명함시안 !== existingSubmission.명함시안
      ) {
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
        }).catch((err) => console.error("명함 스타일 메시지 전송 실패", err));
      }

      // 계약서시안 변경 체크
      if (
        submission.계약서시안 &&
        submission.계약서시안 !== existingSubmission.계약서시안
      ) {
        console.log(`📝 계약서 스타일 선택: ${submission.계약서시안}`);

        await postMessage({
          channelId: user.slackChannelId,
          text: `✅ 계약서 스타일 선택: ${submission.계약서시안}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*✅ 계약서 스타일 선택*\n선택한 스타일: *${submission.계약서시안}*`,
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
        }).catch((err) => console.error("계약서 스타일 메시지 전송 실패", err));
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

      const missingFields = requiredFields.filter(
        (field) => !submission[field as keyof typeof submission],
      );

      if (missingFields.length > 0) {
        return NextResponse.json(
          { error: "필수 항목을 모두 입력해주세요", missingFields },
          { status: 400 },
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
        // 워크플로우 생성/업데이트 (upsert로 안전하게 처리)
        console.log(`✅ 워크플로우 생성/업데이트 중: userId=${userId}`);
        const submitDate = new Date();
        const printTypes = [
          "명함",
          "명찰",
          "대봉투",
          "자문계약서 표지",
          "자문계약서 내지",
        ];

        await prisma.$transaction(
          printTypes.map((type) =>
            prisma.workflow.upsert({
              where: {
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
                isDraft: false,
              },
              update: {
                status: "시안중",
                자료제출일: submitDate,
                isDraft: false,
              },
            }),
          ),
        );
        console.log(`✅ 워크플로우 ${printTypes.length}개 생성/업데이트 완료`);

        // 슬랙 채널명 생성을 위한 이름 (한글 자동 변환)
        const cohortName =
          user.cohort?.englishName || user.cohort?.name || "unknown";
        const userName = user.englishName || user.이름; // 한글이면 자동 변환됨
        const brandName =
          updatedSubmission.brandNameEnglish ||
          updatedSubmission.브랜드명 ||
          "unknown"; // 한글이면 자동 변환됨

        console.log(`🔍 [Submission] 슬랙 채널명 생성 정보:`);
        console.log(
          `  - cohortName: ${cohortName} (원본: ${user.cohort?.name})`,
        );
        console.log(`  - userName: ${userName} (한글: ${user.이름})`);
        console.log(
          `  - brandName: ${brandName} (한글: ${updatedSubmission.브랜드명})`,
        );

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
      { status: 500 },
    );
  }
}
