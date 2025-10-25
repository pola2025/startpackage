/**
 * 워크플로우 삭제 스크립트
 * 실행 방법: npx tsx scripts/delete-workflows.ts [userId]
 */

import prisma from "../lib/prisma";

async function deleteWorkflows() {
  try {
    const userId = process.argv[2];

    if (!userId) {
      console.log("🗑️  모든 워크플로우를 삭제합니다...");

      const result = await prisma.workflow.deleteMany({});

      console.log(`✅ ${result.count}개의 워크플로우가 삭제되었습니다.`);
    } else {
      console.log(`🗑️  사용자 ${userId}의 워크플로우를 삭제합니다...`);

      const result = await prisma.workflow.deleteMany({
        where: { userId },
      });

      console.log(`✅ ${result.count}개의 워크플로우가 삭제되었습니다.`);
    }
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
deleteWorkflows()
  .then(() => {
    console.log("\n✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
