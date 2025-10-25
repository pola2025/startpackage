import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create cohort first
  const cohort = await prisma.cohort.upsert({
    where: { name: "테스트기수" },
    update: {
      isActive: true,
    },
    create: {
      name: "테스트기수",
      교육요일: "목",
      isActive: true,
      교육시작일: new Date(),
      자료제출마감일: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log("✅ 기수 생성 완료:", cohort.name);

  // Create user
  const phone = "01098979834";
  const password = "0102";
  const name = "테스트사용자";
  const email = `test_${phone}@test.com`;

  const hashedPassword = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      이름: name,
      연락처: phone,
      cohortId: cohort.id,
    },
    create: {
      email,
      password: hashedPassword,
      이름: name,
      연락처: phone,
      cohortId: cohort.id,
      SMS수신동의: true,
      이메일수신동의: true,
      role: "user",
    },
  });

  // Create workflows
  await prisma.workflow.deleteMany({
    where: { userId: user.id },
  });

  await prisma.workflow.createMany({
    data: [
      { userId: user.id, type: "명함", status: "대기" },
      { userId: user.id, type: "전단지", status: "진행중" },
      { userId: user.id, type: "홈페이지", status: "완료" },
    ],
  });

  console.log("");
  console.log("✅ 테스트 사용자 생성 완료:");
  console.log(`   로그인 전화번호: ${phone}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   이름: ${name}`);
  console.log(`   기수: ${cohort.name}`);
  console.log("");
  console.log("👤 사용자 로그인: http://localhost:3001");
  console.log("🔐 관리자 로그인: http://localhost:3001/admin/login");
  console.log("   관리자 이메일: mkt@polarad.co.kr");
  console.log("   관리자 비밀번호: 0102");
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
