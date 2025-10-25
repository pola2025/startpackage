/**
 * 기존 워크플로우 삭제 스크립트
 * 잘못된 타입(명함, 전단지, 홈페이지)으로 생성된 워크플로우를 삭제합니다.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupWorkflows() {
  try {
    console.log("🔍 기존 워크플로우 조회 중...");

    // 모든 워크플로우 조회
    const workflows = await prisma.workflow.findMany({
      include: {
        user: {
          select: {
            이름: true,
            email: true,
          },
        },
      },
    });

    console.log(`📊 총 ${workflows.length}개의 워크플로우가 발견되었습니다.\n`);

    if (workflows.length === 0) {
      console.log("✅ 삭제할 워크플로우가 없습니다.");
      return;
    }

    // 워크플로우 목록 출력
    workflows.forEach((wf, index) => {
      console.log(
        `${index + 1}. ${wf.user.이름} (${wf.user.email}) - ${wf.type} [${wf.status}]`
      );
    });

    console.log("\n🗑️  모든 워크플로우를 삭제합니다...");

    // 워크플로우 로그 먼저 삭제 (외래 키 제약조건 때문)
    const deletedLogs = await prisma.workflowLog.deleteMany({});
    console.log(`   - ${deletedLogs.count}개의 워크플로우 로그 삭제됨`);

    // 워크플로우 삭제
    const deletedWorkflows = await prisma.workflow.deleteMany({});
    console.log(`   - ${deletedWorkflows.count}개의 워크플로우 삭제됨`);

    console.log("\n✅ 워크플로우 삭제 완료!");
    console.log(
      "💡 이제 사용자가 '디자인 제작 요청하기' 버튼을 다시 누를 수 있습니다."
    );
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupWorkflows();
