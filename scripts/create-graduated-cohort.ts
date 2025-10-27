import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // "수료생" 기수가 이미 있는지 확인
    const existingCohort = await prisma.cohort.findFirst({
      where: { name: "수료생" },
    });

    if (existingCohort) {
      console.log("✅ '수료생' 기수가 이미 존재합니다.");
      console.log(existingCohort);
      return;
    }

    // "수료생" 기수 생성
    // 자료제출마감일과 교육시작일은 과거 날짜로 설정 (실제로 사용하지 않음)
    const graduatedCohort = await prisma.cohort.create({
      data: {
        name: "수료생",
        englishName: "graduated",
        교육시작일: new Date("2020-01-01"), // 의미 없는 과거 날짜
        교육요일: "해당없음",
        자료제출마감일: new Date("2020-01-01"), // 의미 없는 과거 날짜
        isActive: true,
      },
    });

    console.log("✅ '수료생' 기수가 성공적으로 생성되었습니다!");
    console.log(graduatedCohort);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
