/**
 * submission 제출완료 상태 해제 스크립트
 * 실행 방법: npx tsx scripts/reset-submission-complete.ts [userId]
 */

import prisma from "../lib/prisma";

async function resetSubmissionComplete() {
  try {
    const userId = process.argv[2];

    if (!userId) {
      console.log("📋 모든 사용자의 제출완료 상태를 해제합니다...");

      // 모든 submission의 제출완료 상태 해제
      const result = await prisma.submission.updateMany({
        where: {
          isComplete: true,
        },
        data: {
          isComplete: false,
          completedAt: null,
          시안예정일: null,
        },
      });

      console.log(`✅ ${result.count}개의 submission 제출완료 상태가 해제되었습니다.`);

      // 워크플로우 상태도 초기화
      const workflowResult = await prisma.workflow.updateMany({
        where: {
          status: {
            in: ["시안중", "발주대기", "발주완료", "제작중", "완료"],
          },
        },
        data: {
          status: "대기",
          자료제출일: null,
        },
      });

      console.log(`✅ ${workflowResult.count}개의 워크플로우가 대기 상태로 초기화되었습니다.`);
    } else {
      console.log(`📋 사용자 ${userId}의 제출완료 상태를 해제합니다...`);

      // 특정 사용자의 submission 제출완료 상태 해제
      const submission = await prisma.submission.update({
        where: { userId },
        data: {
          isComplete: false,
          completedAt: null,
          시안예정일: null,
        },
      });

      console.log(`✅ ${submission.userId} 사용자의 제출완료 상태가 해제되었습니다.`);

      // 워크플로우 상태도 초기화
      const workflowResult = await prisma.workflow.updateMany({
        where: {
          userId,
        },
        data: {
          status: "대기",
          자료제출일: null,
        },
      });

      console.log(`✅ ${workflowResult.count}개의 워크플로우가 대기 상태로 초기화되었습니다.`);
    }
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
resetSubmissionComplete()
  .then(() => {
    console.log("\n✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
