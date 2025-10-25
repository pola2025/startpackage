import prisma from "./lib/prisma";

async function deleteOldAdvisoryWorkflow() {
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

  console.log(`\n📋 현재 워크플로우 목록 (${existingWorkflows.length}개):`);
  existingWorkflows.forEach(w => {
    console.log(`  - ${w.type} (${w.status}) [ID: ${w.id}]`);
  });

  // "자문계약서" (표지/내지가 아닌) 워크플로우 찾기
  const oldAdvisory = await prisma.workflow.findFirst({
    where: {
      userId: user.id,
      type: "자문계약서"
    }
  });

  if (!oldAdvisory) {
    console.log("\n✅ 삭제할 기존 '자문계약서' 워크플로우가 없습니다.");
    return;
  }

  console.log(`\n🗑️  삭제 대상: ${oldAdvisory.type} (ID: ${oldAdvisory.id})`);

  // 삭제 실행
  await prisma.workflow.delete({
    where: { id: oldAdvisory.id }
  });

  console.log(`✅ 워크플로우 삭제 완료!`);

  // 최종 확인
  const finalWorkflows = await prisma.workflow.findMany({
    where: { userId: user.id }
  });

  console.log(`\n📋 최종 워크플로우 목록 (${finalWorkflows.length}개):`);
  finalWorkflows.forEach(w => {
    console.log(`  - ${w.type} (${w.status})`);
  });
}

deleteOldAdvisoryWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
