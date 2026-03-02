/**
 * 로고 워크플로우가 없는 사용자에게 일괄 생성하는 스크립트
 * 실행 방법: npx tsx scripts/create-missing-logo-workflows.ts
 */

import prisma from "../lib/prisma";

async function createMissingLogoWorkflows() {
  try {
    console.log("🔍 로고 워크플로우가 없는 사용자를 찾는 중...");

    // role이 user인 사용자 중 로고 워크플로우가 없는 사람 조회
    const users = await prisma.user.findMany({
      where: {
        role: "user",
        workflows: {
          none: { type: "로고" },
        },
      },
      include: {
        cohort: true,
      },
    });

    if (users.length === 0) {
      console.log("✅ 모든 사용자에게 로고 워크플로우가 있습니다.");
      return;
    }

    console.log(
      `📝 ${users.length}명의 사용자에게 로고 워크플로우를 생성합니다...\n`,
    );

    for (const user of users) {
      await prisma.workflow.create({
        data: {
          userId: user.id,
          type: "로고",
          status: "대기",
          isDraft: true,
          draftSavedAt: new Date(),
        },
      });

      const cohortName = user.cohort?.name ?? "기수 없음";
      console.log(
        `✅ [${cohortName}] ${user.이름} (${user.email}) - 로고 워크플로우 생성 완료`,
      );
    }

    console.log(
      `\n🎉 총 ${users.length}개의 로고 워크플로우가 생성되었습니다.`,
    );
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMissingLogoWorkflows()
  .then(() => {
    console.log("✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
