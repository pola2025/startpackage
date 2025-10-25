/**
 * submission이 없는 사용자를 위한 submission 생성 스크립트
 * 실행 방법: npx tsx scripts/create-missing-submissions.ts
 */

import prisma from "../lib/prisma";

async function createMissingSubmissions() {
  try {
    console.log("🔍 submission이 없는 사용자를 찾는 중...");

    // 모든 사용자 조회
    const users = await prisma.user.findMany({
      where: {
        role: "user", // 관리자는 제외
      },
      include: {
        submission: true,
      },
    });

    // submission이 없는 사용자 필터링
    const usersWithoutSubmission = users.filter((user) => !user.submission);

    if (usersWithoutSubmission.length === 0) {
      console.log("✅ 모든 사용자에게 submission이 있습니다.");
      return;
    }

    console.log(`📝 ${usersWithoutSubmission.length}명의 사용자에게 submission을 생성합니다...`);

    // submission 생성
    for (const user of usersWithoutSubmission) {
      await prisma.submission.create({
        data: {
          userId: user.id,
        },
      });

      console.log(`✅ ${user.이름} (${user.email}) - submission 생성 완료`);
    }

    console.log(`\n🎉 ${usersWithoutSubmission.length}개의 submission이 생성되었습니다.`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
createMissingSubmissions()
  .then(() => {
    console.log("\n✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
