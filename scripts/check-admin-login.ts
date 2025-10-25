/**
 * 관리자 로그인 확인 스크립트
 */

import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("관리자 로그인 확인 중...\n");

  const email = "mkt@polarad.co.kr";
  const password = "0102";

  // 1. Admin 테이블에서 확인
  console.log("=== Admin 테이블 확인 ===");
  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    console.log("❌ 관리자를 찾을 수 없습니다!");

    // 관리자 생성
    console.log("\n관리자 계정 생성 중...");
    const hashedPassword = await hash(password, 10);

    const newAdmin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name: "관리자",
        role: "super",
      },
    });

    console.log("✅ 관리자 계정 생성 완료:", newAdmin);
  } else {
    console.log("✅ 관리자 발견:", {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    // 비밀번호 검증
    console.log("\n=== 비밀번호 검증 ===");
    const isValid = await compare(password, admin.password);

    if (isValid) {
      console.log("✅ 비밀번호가 일치합니다!");
    } else {
      console.log("❌ 비밀번호가 일치하지 않습니다. 재설정 중...");

      const hashedPassword = await hash(password, 10);
      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: hashedPassword },
      });

      console.log("✅ 비밀번호를 0102로 재설정했습니다.");
    }
  }

  // 2. User 테이블 확인 (혹시 중복이 있는지)
  console.log("\n=== User 테이블 중복 확인 ===");
  const userWithSameEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (userWithSameEmail) {
    console.log("⚠️  User 테이블에 같은 이메일이 있습니다!");
    console.log("이메일:", userWithSameEmail.email);
    console.log("이름:", userWithSameEmail.이름);
  } else {
    console.log("✅ User 테이블에 중복 없음");
  }

  // 3. 모든 관리자 목록
  console.log("\n=== 전체 관리자 목록 ===");
  const allAdmins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  console.table(allAdmins);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👔 관리자 로그인 정보:");
  console.log("   - URL: http://localhost:3005/admin/login");
  console.log("   - 이메일: mkt@polarad.co.kr");
  console.log("   - 비밀번호: 0102");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
