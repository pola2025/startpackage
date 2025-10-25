import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "mkt@polarad.co.kr";
  const password = "0102";
  const name = "관리자";

  const hashedPassword = await hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      role: "admin",
    },
    create: {
      email,
      password: hashedPassword,
      name,
      role: "admin",
    },
  });

  console.log("✅ 관리자 이메일 업데이트 완료:");
  console.log(`   이메일: ${admin.email}`);
  console.log(`   비밀번호: ${password}`);
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
