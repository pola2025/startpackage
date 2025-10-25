/**
 * 사용자 목록 조회 스크립트
 */

import prisma from "../lib/prisma";

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "user",
      },
      include: {
        cohort: true,
        submission: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`\n📋 사용자 목록 (총 ${users.length}명):\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.이름} (${user.email})`);
      console.log(`   기수: ${user.cohort?.name || "미지정"}`);
      console.log(`   제출완료: ${user.submission?.isComplete ? "✅" : "❌"}`);
      console.log(`   ID: ${user.id}\n`);
    });
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
