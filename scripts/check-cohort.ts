import prisma from "../lib/prisma";

async function checkCohort() {
  const cohorts = await prisma.cohort.findMany();
  console.log("기수 정보:");
  cohorts.forEach(c => {
    console.log(`  ID: ${c.id}`);
    console.log(`  이름: ${c.name}`);
    console.log(`  영문명: ${c.englishName}`);
    console.log();
  });
  await prisma.$disconnect();
}

checkCohort();
