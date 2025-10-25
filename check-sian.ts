import prisma from "./lib/prisma";

async function checkSian() {
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
      type: true,
      status: true,
      시안URL: true,
      발주승인일: true,
    }
  });

  console.log(`\n✅ 이재호 워크플로우:\n`);
  workflows.forEach(w => {
    console.log(`${w.type} (${w.status})`);
    console.log(`  시안URL: ${w.시안URL || '❌ 없음'}`);
    console.log(`  발주승인일: ${w.발주승인일 || '없음'}`);
    console.log('');
  });
}

checkSian()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
