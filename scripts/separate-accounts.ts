/**
 * 일반 사용자와 관리자 계정 분리 스크립트
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("계정 분리 작업 시작...\n");

  // 1. 현재 사용자 확인
  console.log("=== 현재 사용자 확인 ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      이름: true,
      email: true,
      연락처: true,
      role: true,
    },
  });
  console.log("사용자 목록:", users);

  // 2. 현재 관리자 확인
  console.log("\n=== 현재 관리자 확인 ===");
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  console.log("관리자 목록:", admins);

  // 3. 이재호 사용자 찾기 (연락처: 01098979834)
  const regularUser = await prisma.user.findFirst({
    where: {
      OR: [
        { 연락처: "01098979834" },
        { 이름: "이재호" },
      ],
    },
  });

  if (regularUser) {
    console.log("\n=== 이재호 사용자 발견 ===");
    console.log(regularUser);

    // role이 admin이면 user로 변경
    if (regularUser.role !== "user") {
      await prisma.user.update({
        where: { id: regularUser.id },
        data: { role: "user" },
      });
      console.log("✅ 이재호 계정을 일반 사용자(user)로 변경했습니다.");
    } else {
      console.log("✅ 이재호 계정은 이미 일반 사용자입니다.");
    }
  } else {
    console.log("\n⚠️  이재호 사용자를 찾을 수 없습니다.");
  }

  // 4. mkt@polarad.co.kr 관리자 계정 생성/확인
  console.log("\n=== mkt@polarad.co.kr 관리자 계정 확인 ===");

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: "mkt@polarad.co.kr" },
  });

  if (existingAdmin) {
    console.log("✅ 관리자 계정이 이미 존재합니다:", existingAdmin);
  } else {
    // 비밀번호: 0102
    const hashedPassword = await hash("0102", 10);

    const newAdmin = await prisma.admin.create({
      data: {
        email: "mkt@polarad.co.kr",
        password: hashedPassword,
        name: "관리자",
        role: "super", // 최고 관리자 권한
      },
    });

    console.log("✅ 새 관리자 계정을 생성했습니다:", newAdmin);
  }

  // 5. mkt@polarad.co.kr이 User 테이블에 있다면 제거 또는 role 변경
  const adminAsUser = await prisma.user.findUnique({
    where: { email: "mkt@polarad.co.kr" },
  });

  if (adminAsUser) {
    console.log("\n⚠️  mkt@polarad.co.kr이 User 테이블에도 존재합니다.");
    console.log("일반 사용자 테이블에서 제거할까요? (수동으로 확인 필요)");
    console.log("User 정보:", adminAsUser);
  }

  // 최종 상태 출력
  console.log("\n=== 최종 계정 상태 ===");

  const finalUsers = await prisma.user.findMany({
    select: {
      id: true,
      이름: true,
      email: true,
      연락처: true,
      role: true,
    },
  });
  console.log("\n일반 사용자:");
  console.table(finalUsers);

  const finalAdmins = await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
  console.log("\n관리자:");
  console.table(finalAdmins);

  console.log("\n✅ 계정 분리 작업 완료!");
}

main()
  .catch((e) => {
    console.error("오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
