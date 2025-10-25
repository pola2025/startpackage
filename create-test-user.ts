import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = "01098979834";
  const password = "0102";
  const name = "테스트사용자";
  const email = `test_${phone}@test.com`;

  // Get first cohort (if exists)
  const cohort = await prisma.cohort.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!cohort) {
    console.log("❌ 기수가 없습니다. 먼저 기수를 생성해주세요.");
    return;
  }

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

  // Create workflows for the user
  await prisma.workflow.deleteMany({
    where: { userId: user.id },
  });

  await prisma.workflow.createMany({
    data: [
      { userId: user.id, type: "명함", status: "대기" },
      { userId: user.id, type: "전단지", status: "대기" },
      { userId: user.id, type: "홈페이지", status: "대기" },
    ],
  });

  console.log("✅ 테스트 사용자 생성 완료:");
  console.log(`   로그인 전화번호: ${phone}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   이름: ${name}`);
  console.log(`   기수: ${cohort.기수명}`);
  console.log("");
  console.log("로그인 URL: http://localhost:3001");
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
