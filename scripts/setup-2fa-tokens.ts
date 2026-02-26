// 기존 관리자에게 2FA 셋업 토큰 생성
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // 기존 관리자 조회
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      twoFactorEnabled: true,
      twoFactorSetupToken: true,
    },
  });

  console.log(`\n=== 관리자 ${admins.length}명 확인 ===\n`);

  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  for (const admin of admins) {
    console.log(`[${admin.role}] ${admin.name} (${admin.email})`);
    console.log(`  2FA 활성화: ${admin.twoFactorEnabled ? "YES" : "NO"}`);

    if (admin.twoFactorEnabled) {
      console.log("  → 이미 설정 완료, 스킵\n");
      continue;
    }

    // 셋업 토큰 생성
    const setupToken = randomBytes(32).toString("hex");

    await prisma.admin.update({
      where: { id: admin.id },
      data: { twoFactorSetupToken: setupToken },
    });

    const setupUrl = `${baseUrl}/admin/setup-2fa?token=${setupToken}&email=${encodeURIComponent(admin.email)}`;

    console.log(`  → 셋업 토큰 생성 완료`);
    console.log(`  → 셋업 URL: ${setupUrl}\n`);
  }

  console.log("=== 완료 ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
