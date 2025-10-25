/**
 * 관리자 인증 테스트
 */

import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

async function testAuth() {
  const email = "mkt@polarad.co.kr";
  const password = "0102";

  console.log("=== 인증 테스트 시작 ===\n");
  console.log("입력값:");
  console.log("  이메일:", email);
  console.log("  비밀번호:", password);
  console.log("");

  // Step 1: User 테이블 확인
  console.log("Step 1: User 테이블에서 이메일 검색...");
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    console.log("❌ User 테이블에서 발견됨! (이것이 문제입니다)");
    console.log("   이름:", user.이름);
    console.log("   역할:", user.role);
    console.log("   연락처:", user.연락처);

    // 비밀번호 확인
    const isValid = await compare(password, user.password);
    console.log("   비밀번호 일치:", isValid);

    if (isValid && user.role !== "admin") {
      console.log("\n⚠️  문제: User로 로그인되지만 role이 'admin'이 아닙니다!");
      console.log("   현재 role:", user.role);
    }
  } else {
    console.log("✅ User 테이블에 없음 (정상)");
  }

  // Step 2: Admin 테이블 확인
  console.log("\nStep 2: Admin 테이블에서 이메일 검색...");
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (admin) {
    console.log("✅ Admin 테이블에서 발견됨!");
    console.log("   이름:", admin.name);
    console.log("   역할:", admin.role);

    // 비밀번호 확인
    const isValid = await compare(password, admin.password);
    console.log("   비밀번호 일치:", isValid);

    if (isValid) {
      console.log("\n✅ 인증 성공! 이 정보로 로그인해야 합니다:");
      console.log({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      });
    } else {
      console.log("\n❌ 비밀번호 불일치!");
    }
  } else {
    console.log("❌ Admin 테이블에 없음!");
  }

  console.log("\n=== 결론 ===");
  if (user && !admin) {
    console.log("❌ 문제: User 테이블에만 있음. Admin 테이블로 이동 필요");
  } else if (!user && admin) {
    console.log("✅ 정상: Admin 테이블에만 있음");
  } else if (user && admin) {
    console.log("⚠️  경고: 둘 다 있음. User 테이블에서 제거 필요");
  } else {
    console.log("❌ 심각: 둘 다 없음!");
  }
}

testAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
