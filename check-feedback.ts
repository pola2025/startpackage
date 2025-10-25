import prisma from "./lib/prisma";

async function checkFeedback() {
  const user = await prisma.user.findFirst({
    where: { 이름: "이재호" }
  });

  if (!user) {
    console.log("❌ 이재호 사용자를 찾을 수 없습니다.");
    return;
  }

  const workflows = await prisma.workflow.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      type: true,
      status: true,
      feedback: true,
      feedbackDate: true,
    }
  });

  console.log(`\n✅ 이재호 워크플로우 (${workflows.length}개):\n`);
  workflows.forEach(w => {
    console.log(`${w.type} (${w.status})`);
    console.log(`  ID: ${w.id}`);
    console.log(`  피드백: ${w.feedback || '없음'}`);
    console.log(`  피드백 날짜: ${w.feedbackDate || '없음'}`);
    console.log('');
  });
}

checkFeedback()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
