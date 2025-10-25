import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  // 1. 관리자 계정 생성
  const adminPassword = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@startpackage.com" },
    update: {},
    create: {
      email: "admin@startpackage.com",
      password: adminPassword,
      name: "관리자",
      role: "super",
    },
  });

  console.log("✅ 관리자 계정 생성:", admin.email);

  // 2. 테스트 기수 생성
  const cohort = await prisma.cohort.upsert({
    where: { name: "1기" },
    update: {},
    create: {
      name: "1기",
      교육시작일: new Date("2025-01-15"),
      교육요일: "목",
      자료제출마감일: new Date("2025-02-05"), // 3주 후
      isActive: true,
    },
  });

  console.log("✅ 기수 생성:", cohort.name);

  // 3. 테스트 사용자 생성
  const userPassword = await bcrypt.hash("user1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      password: userPassword,
      이름: "홍길동",
      연락처: "01012345678",
      cohortId: cohort.id,
      SMS수신동의: true,
      이메일수신동의: true,
      role: "user",
    },
  });

  console.log("✅ 테스트 사용자 생성:", user.email);

  // 4. 테스트 워크플로우 생성
  const workflows = await Promise.all([
    prisma.workflow.create({
      data: {
        userId: user.id,
        type: "명함",
        status: "대기",
        자료제출일: new Date(),
      },
    }),
    prisma.workflow.create({
      data: {
        userId: user.id,
        type: "전단지",
        status: "대기",
      },
    }),
    prisma.workflow.create({
      data: {
        userId: user.id,
        type: "홈페이지",
        status: "대기",
      },
    }),
  ]);

  console.log("✅ 워크플로우 생성:", workflows.length, "개");

  // 5. 시스템 설정 생성
  await prisma.setting.createMany({
    data: [
      {
        key: "수정최대횟수",
        value: "2",
        description: "디자인 무료 수정 최대 횟수",
      },
      {
        key: "추가수정비용",
        value: "10000",
        description: "추가 수정 시 비용 (원)",
      },
      {
        key: "택배회사목록",
        value: JSON.stringify([
          "CJ대한통운",
          "우체국택배",
          "한진택배",
          "로젠택배",
        ]),
        description: "사용 가능한 택배회사 목록",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ 시스템 설정 생성 완료");

  console.log("\n🎉 시드 데이터 생성 완료!");
  console.log("\n📋 테스트 계정:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("관리자:");
  console.log("  이메일: admin@startpackage.com");
  console.log("  비밀번호: admin1234");
  console.log("\n사용자:");
  console.log("  이메일: test@example.com");
  console.log("  비밀번호: user1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ 시드 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
