import prisma from "../lib/prisma";

async function fixCohortEnglishName() {
  // 19기 목 기수 업데이트
  const cohort = await prisma.cohort.findFirst({
    where: { name: "19기 목" },
  });

  if (cohort) {
    await prisma.cohort.update({
      where: { id: cohort.id },
      data: { englishName: "19th" },
    });
    console.log(`✅ 19기 목 기수 영문명 업데이트 완료: ${cohort.name} -> 19th`);
  } else {
    console.log("❌ 19기 목 기수를 찾을 수 없습니다");
  }

  await prisma.$disconnect();
}

fixCohortEnglishName();
