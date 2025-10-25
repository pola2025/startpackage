import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@startpackage.com";
  const password = "0102";
  const name = "관리자";

  // 비밀번호 해시
  const hashedPassword = await hash(password, 10);

  // 관리자 생성 (이미 있으면 업데이트)
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

  console.log("✅ 관리자 계정 생성 완료:");
  console.log(`   이메일: ${admin.email}`);
  console.log(`   비밀번호: ${password}`);
  console.log(`   이름: ${admin.name}`);
  console.log(`   권한: ${admin.role}`);
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
