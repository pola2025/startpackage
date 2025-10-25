/**
 * 기존 데이터에 영문명 추가 스크립트
 */

import prisma from "../lib/prisma";

async function updateEnglishNames() {
  try {
    console.log("📝 영문명 업데이트 시작...\n");

    // 1. 19기 목 기수 업데이트
    const cohort = await prisma.cohort.findFirst({
      where: { name: { contains: "19기" } },
    });

    if (cohort) {
      await prisma.cohort.update({
        where: { id: cohort.id },
        data: { englishName: "19th" },
      });
      console.log(`✅ 기수 업데이트: ${cohort.name} -> 19th`);
    }

    // 2. 이재호 사용자 업데이트
    const user = await prisma.user.findFirst({
      where: { email: "framei@naver.com" },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { englishName: "leejaeho" },
      });
      console.log(`✅ 사용자 업데이트: ${user.이름} -> leejaeho`);
    }

    // 3. 제출 정보에 브랜드 영문명 추가
    if (user) {
      const submission = await prisma.submission.findUnique({
        where: { userId: user.id },
      });

      if (submission && submission.브랜드명) {
        await prisma.submission.update({
          where: { userId: user.id },
          data: { brandNameEnglish: "polarad" },
        });
        console.log(`✅ 브랜드명 업데이트: ${submission.브랜드명} -> polarad`);
      }
    }

    console.log("\n🎉 영문명 업데이트 완료!");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateEnglishNames();
