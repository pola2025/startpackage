/**
 * 전화번호 정규화 스크립트
 * - DB에 하이픈이 포함된 전화번호를 하이픈 없는 형식으로 변환
 *
 * 실행: npx tsx scripts/fix-phone-numbers.ts
 */

import prisma from "../lib/prisma";

async function fixPhoneNumbers() {
  console.log("🔍 전화번호 정규화 스크립트 시작...\n");

  // 1. 하이픈이 포함된 전화번호 조회
  const usersWithHyphen = await prisma.user.findMany({
    where: {
      연락처: {
        contains: "-",
      },
    },
    select: {
      id: true,
      이름: true,
      연락처: true,
      email: true,
    },
  });

  console.log(`📋 하이픈이 포함된 전화번호: ${usersWithHyphen.length}건\n`);

  if (usersWithHyphen.length === 0) {
    console.log("✅ 정리할 데이터가 없습니다. 모든 전화번호가 정상입니다.");
    return;
  }

  // 2. 변환 예정 목록 출력
  console.log("변환 예정 목록:");
  console.log("-".repeat(60));
  usersWithHyphen.forEach((user, index) => {
    const cleanPhone = user.연락처.replace(/-/g, "");
    console.log(
      `${index + 1}. ${user.이름} | ${user.연락처} → ${cleanPhone}`
    );
  });
  console.log("-".repeat(60));
  console.log("");

  // 3. 트랜잭션으로 일괄 업데이트
  console.log("🔄 데이터 정리 중...\n");

  const results = await prisma.$transaction(
    usersWithHyphen.map((user) =>
      prisma.user.update({
        where: { id: user.id },
        data: {
          연락처: user.연락처.replace(/-/g, ""),
        },
        select: {
          id: true,
          이름: true,
          연락처: true,
        },
      })
    )
  );

  // 4. 결과 출력
  console.log("✅ 정리 완료:");
  console.log("-".repeat(60));
  results.forEach((user, index) => {
    console.log(`${index + 1}. ${user.이름} → ${user.연락처}`);
  });
  console.log("-".repeat(60));
  console.log(`\n🎉 총 ${results.length}건의 전화번호가 정규화되었습니다.`);
}

// 실행
fixPhoneNumbers()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
