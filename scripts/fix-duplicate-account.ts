/**
 * 중복 계정 수정 스크립트
 * mkt@polarad.co.kr 이메일이 User와 Admin 테이블에 모두 존재하는 문제 해결
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("중복 계정 수정 작업 시작...\n");

  // 1. User 테이블의 이재호(mkt@polarad.co.kr) 이메일을 전화번호 기반으로 변경
  const userToUpdate = await prisma.user.findUnique({
    where: { email: "mkt@polarad.co.kr" },
  });

  if (userToUpdate) {
    console.log("=== User 테이블에서 mkt@polarad.co.kr 발견 ===");
    console.log("이름:", userToUpdate.이름);
    console.log("연락처:", userToUpdate.연락처);

    // 이메일을 연락처 기반으로 변경 (로그인은 연락처로 가능)
    const newEmail = `user_${userToUpdate.연락처}@temp.local`;

    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        email: newEmail,
      },
    });

    console.log(`✅ User 테이블의 이메일을 ${newEmail}로 변경했습니다.`);
    console.log("   (이 사용자는 연락처 ${userToUpdate.연락처}로 로그인 가능합니다)\n");
  }

  // 2. Admin 테이블의 role을 super로 변경
  const adminToUpdate = await prisma.admin.findUnique({
    where: { email: "mkt@polarad.co.kr" },
  });

  if (adminToUpdate) {
    console.log("=== Admin 테이블에서 mkt@polarad.co.kr 발견 ===");

    if (adminToUpdate.role !== "super") {
      await prisma.admin.update({
        where: { id: adminToUpdate.id },
        data: {
          role: "super",
        },
      });
      console.log("✅ Admin 권한을 'super'로 변경했습니다.\n");
    } else {
      console.log("✅ 이미 'super' 권한입니다.\n");
    }

    // 비밀번호가 0102인지 확인 (필요시 재설정)
    console.log("비밀번호 재설정 (0102)...");
    const newPassword = await hash("0102", 10);
    await prisma.admin.update({
      where: { id: adminToUpdate.id },
      data: {
        password: newPassword,
      },
    });
    console.log("✅ 비밀번호를 0102로 재설정했습니다.\n");
  }

  // 3. 일반 사용자 비밀번호도 0102로 설정
  if (userToUpdate) {
    console.log("=== 일반 사용자 비밀번호 재설정 ===");
    const userPassword = await hash("0102", 10);
    await prisma.user.update({
      where: { id: userToUpdate.id },
      data: {
        password: userPassword,
      },
    });
    console.log("✅ 일반 사용자 비밀번호를 0102로 재설정했습니다.\n");
  }

  // 최종 상태 확인
  console.log("=== 최종 계정 상태 ===\n");

  const finalUsers = await prisma.user.findMany({
    where: {
      OR: [
        { 연락처: "01098979834" },
        { 이름: "이재호" },
      ],
    },
    select: {
      id: true,
      이름: true,
      email: true,
      연락처: true,
      role: true,
    },
  });
  console.log("일반 사용자 (이재호):");
  console.table(finalUsers);

  const finalAdmin = await prisma.admin.findUnique({
    where: { email: "mkt@polarad.co.kr" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  console.log("\n관리자 (mkt@polarad.co.kr):");
  console.table([finalAdmin]);

  console.log("\n✅ 계정 분리 완료!");
  console.log("\n로그인 정보:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 일반 사용자:");
  console.log("   - 로그인 페이지: http://localhost:3005/login");
  console.log("   - 이메일/전화번호: 01098979834");
  console.log("   - 비밀번호: 0102");
  console.log("");
  console.log("👔 관리자:");
  console.log("   - 로그인 페이지: http://localhost:3005/admin/login");
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
