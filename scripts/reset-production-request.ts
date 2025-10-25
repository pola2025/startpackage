/**
 * 디자인 시안 제작요청 초기화 스크립트 (제출자료는 유지)
 * 실행 방법: npx tsx scripts/reset-production-request.ts [userId or email]
 */

import prisma from "../lib/prisma";

async function resetProductionRequest() {
  try {
    const userIdentifier = process.argv[2];

    if (!userIdentifier) {
      console.log("❌ 사용자 ID 또는 이메일을 입력해주세요.");
      console.log("사용 예시: npx tsx scripts/reset-production-request.ts user@example.com");
      process.exit(1);
    }

    // 사용자 찾기 (ID 또는 이메일로)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdentifier },
          { email: userIdentifier },
        ],
      },
      include: {
        submission: true,
        workflows: true,
      },
    });

    if (!user) {
      console.log(`❌ 사용자를 찾을 수 없습니다: ${userIdentifier}`);
      process.exit(1);
    }

    console.log(`\n📋 사용자 정보:`);
    console.log(`   이름: ${user.이름}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   제출완료 상태: ${user.submission?.isComplete ? "완료" : "미완료"}`);
    console.log(`   워크플로우 개수: ${user.workflows.length}개`);
    console.log(`   슬랙 채널 ID: ${user.slackChannelId || "없음"}\n`);

    // 1. submission의 제작요청 상태만 초기화 (자료는 유지)
    if (user.submission) {
      await prisma.submission.update({
        where: { userId: user.id },
        data: {
          isComplete: false,
          completedAt: null,
          시안예정일: null,
        },
      });
      console.log("✅ submission 제작요청 상태 초기화 완료");
    }

    // 2. 워크플로우 삭제
    if (user.workflows.length > 0) {
      const deletedWorkflows = await prisma.workflow.deleteMany({
        where: { userId: user.id },
      });
      console.log(`✅ 워크플로우 ${deletedWorkflows.count}개 삭제 완료`);
    }

    // 3. User의 slackChannelId 초기화 (새 채널 생성을 위해)
    if (user.slackChannelId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { slackChannelId: null },
      });
      console.log("✅ 슬랙 채널 ID 초기화 완료");
    }

    console.log(`\n🎉 ${user.이름}님의 제작요청이 초기화되었습니다.`);
    console.log("   제출자료는 그대로 유지되며, 다시 제작요청할 수 있습니다.\n");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
resetProductionRequest()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
