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
import { formatPhoneNumber } from "@/lib/utils";
import { isPaidHomepageStyle } from "@/lib/homepage-styles";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { notifySubmissionChanges } from "@/lib/notification/submissionNotifications";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { decryptSubmissionSecrets, dropMaskedSecretFields, encryptSubmissionSecrets, maskSubmissionSecretsDeep } from "@/lib/security/submission-secrets";

function formatPhoneSafe(phone: unknown): string {
  if (!phone) return "";
  return formatPhoneNumber(String(phone));
}

const SHIPPING_FIELDS = ["인쇄물받을주소", "받는분이름", "수령연락처", "우편번호"];

async function hasLockedShippingConflict(userId: string, data: Record<string, unknown>) {
  const fields = SHIPPING_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(data, field));
  if (!fields.length) return false;
  const locked = await prisma.workflow.findFirst({
    where: { userId, type: { notIn: ["로고", "홈페이지"] }, status: { in: ["발주요청", "발주완료", "제작완료", "발송완료"] } },
    select: { id: true },
  });
  if (!locked) return false;
  const current = await prisma.submission.findUnique({ where: { userId } });
  return fields.some((field) => data[field] !== (current?.[field as keyof typeof current] ?? null));
}

// GET: 사용자 제출 데이터 조회
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id; // ✅ 타입 안전

    if (isD1RuntimeEnabled()) {
      const submission = await callCore<Record<string, unknown>>("submission-get", userId, { userId });
      return NextResponse.json(maskSubmissionSecretsDeep(submission));
    }

    // Submission 조회 또는 생성
    let submission = await prisma.submission.findUnique({
      where: { userId },
    });

    if (!submission) {
      submission = await prisma.submission.create({
        data: { userId },
      });
    }

    // 배송지 필수 정책 대상 기수인지 함께 내려준다 (확정 게이트가 단계 구성에 사용)
    const { isShippingPolicyCohort } = await import("@/lib/shipping-policy");
    const 사용자 = await prisma.user.findUnique({
      where: { id: userId },
      select: { cohort: { select: { 교육시작일: true } } },
    });

    return NextResponse.json({
      ...maskSubmissionSecretsDeep(submission),
      _배송지필수: isShippingPolicyCohort(사용자?.cohort?.교육시작일),
    });
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

    const body = dropMaskedSecretFields(await request.json());

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

      if (isPaidHomepageStyle(validatedData.홈페이지스타일)) {
        return NextResponse.json(
          {
            error:
              "유료옵션은 Meta 광고 유료 결제 시 제공되며 개별문의가 필요합니다.",
          },
          { status: 400 },
        );
      }

      if (isD1RuntimeEnabled()) {
        const storedResult = await callCore<Record<string, unknown>>("submission-save", userId, {
          userId,
          data: validatedData,
        });
        const meta = storedResult.__d1Meta as { user?: { email?: string; 이름?: string; englishName?: string; 연락처?: string; slackChannelId?: string | null; cohortName?: string; cohortEnglishName?: string }; previous?: Record<string, unknown> } | undefined;
        delete storedResult.__d1Meta;
        const result = decryptSubmissionSecrets(storedResult, userId);
        if (meta?.previous) meta.previous = decryptSubmissionSecrets(meta.previous, userId);
        if (meta?.user) {
          await notifySubmissionChanges(userId, result, meta.previous, meta.user, (channelId: string) => callCore("user-slack-channel-update", userId, { userId, slackChannelId: channelId }), Object.keys(validatedData)).catch((error: unknown) => console.error("제출 변경 알림 실패:", error));
        }
        if (validatedData.isComplete === true && meta?.user) {
          await handleSubmissionComplete({
            userId,
            cohortName: meta.user.cohortEnglishName || meta.user.cohortName || "unknown",
            userName: meta.user.englishName || meta.user.이름 || "unknown",
            brandName: String(result.brandNameEnglish || result.브랜드명 || "unknown"),
            userEmail: meta.user.email || "",
            userPhone: meta.user.연락처 || "",
            submissionData: result,
          }).catch((error) => console.error("알림 발송 실패:", error));
        }
        return NextResponse.json(maskSubmissionSecretsDeep(result));
      }
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Zod validation error:", error.errors);
        return NextResponse.json(
          { error: "Invalid data", details: error.errors },
          { status: 400 },
        );
      }
      throw error;
    }

    // 기존 submission 상태 확인 (제작요청 처리 전에 체크하기 위함)
    const storedExistingSubmission = await prisma.submission.findUnique({
      where: { userId },
    });
    const existingSubmission = storedExistingSubmission
      ? decryptSubmissionSecrets(storedExistingSubmission, userId)
      : null;
    const wasNotComplete = !existingSubmission?.isComplete;

    if (await hasLockedShippingConflict(userId, validatedData)) {
      return NextResponse.json({ error: "발주 요청 이후 배송지는 변경할 수 없습니다." }, { status: 409 });
    }

    // Submission 업데이트
    const encryptedData = encryptSubmissionSecrets(validatedData, userId);
    const storedSubmission = await prisma.submission.upsert({
      where: { userId },
      create: {
        userId,
        ...encryptedData,
      },
      update: encryptedData,
    });
    const submission = decryptSubmissionSecrets(storedSubmission, userId);

    // 사용자 정보 조회 (슬랙 채널 ID 확인용)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { cohort: true },
    });

    if (user) {
      await notifySubmissionChanges(userId, submission as Record<string, unknown>, existingSubmission as Record<string, unknown> | undefined, {
        email: user.email,
        이름: user.이름,
        englishName: user.englishName || undefined,
        연락처: user.연락처 || undefined,
        slackChannelId: user.slackChannelId || undefined,
        cohortName: user.cohort?.name,
        cohortEnglishName: user.cohort?.englishName || undefined,
      }, async (channelId) => {
        await prisma.user.update({ where: { id: userId }, data: { slackChannelId: channelId } });
        user.slackChannelId = channelId;
      }, Object.keys(validatedData)).catch((error: unknown) => console.error("제출 변경 알림 실패:", error));
    }

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

      return NextResponse.json(maskSubmissionSecretsDeep(updatedSubmission));
    }

    return NextResponse.json(maskSubmissionSecretsDeep(submission));
  } catch (error) {
    const response = dataServiceErrorResponse(error);
    if (response) return response;
    console.error("POST /api/submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
