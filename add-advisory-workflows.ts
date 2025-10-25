import prisma from "./lib/prisma";

async function addAdvisoryWorkflows() {
  // 이재호 사용자 찾기
  const user = await prisma.user.findFirst({
    where: {
      이름: "이재호"
    }
  });

  if (!user) {
    console.error("❌ 이재호 사용자를 찾을 수 없습니다.");
    return;
  }

  console.log(`✅ 사용자 발견: ${user.이름} (ID: ${user.id})`);

  // 기존 워크플로우 확인
  const existingWorkflows = await prisma.workflow.findMany({
    where: { userId: user.id }
  });

  console.log(`📋 기존 워크플로우 개수: ${existingWorkflows.length}`);
  existingWorkflows.forEach(w => {
    console.log(`  - ${w.type} (${w.status})`);
  });

  // 자문계약서 표지/내지가 이미 있는지 확인
  const hasAdvisoryCover = existingWorkflows.some(w => w.type === "자문계약서 표지");
  const hasAdvisoryInside = existingWorkflows.some(w => w.type === "자문계약서 내지");

  if (hasAdvisoryCover && hasAdvisoryInside) {
    console.log("✅ 이미 자문계약서 표지와 내지가 존재합니다.");
    return;
  }

  // 자료제출일 찾기 (기존 워크플로우에서)
  const 자료제출일 = existingWorkflows[0]?.자료제출일 || new Date();

  const workflowsToAdd = [];

  if (!hasAdvisoryCover) {
    workflowsToAdd.push({
      userId: user.id,
      type: "자문계약서 표지",
      status: "시안중",
      자료제출일
    });
  }

  if (!hasAdvisoryInside) {
    workflowsToAdd.push({
      userId: user.id,
      type: "자문계약서 내지",
      status: "시안중",
      자료제출일
    });
  }

  if (workflowsToAdd.length > 0) {
    console.log(`\n🚀 워크플로우 추가 중...`);
    await prisma.workflow.createMany({
      data: workflowsToAdd
    });
    console.log(`✅ ${workflowsToAdd.length}개 워크플로우 추가 완료!`);
    workflowsToAdd.forEach(w => {
      console.log(`  ✓ ${w.type}`);
    });
  }

  // 최종 확인
  const finalWorkflows = await prisma.workflow.findMany({
    where: { userId: user.id }
  });

  console.log(`\n📋 최종 워크플로우 목록 (${finalWorkflows.length}개):`);
  finalWorkflows.forEach(w => {
    console.log(`  - ${w.type} (${w.status})`);
  });
}

addAdvisoryWorkflows()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
