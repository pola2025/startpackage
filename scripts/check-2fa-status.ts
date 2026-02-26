import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      twoFactorSetupToken: true,
    },
  });

  for (const a of admins) {
    console.log(a.email);
    console.log("  enabled:", a.twoFactorEnabled);
    console.log("  secret:", a.twoFactorSecret ? "SET (" + a.twoFactorSecret.substring(0, 8) + "...)" : "NULL");
    console.log("  setupToken:", a.twoFactorSetupToken ? "SET" : "NULL");
    console.log("");
  }

  // Check env
  console.log("NEXT_PUBLIC_USE_NEW_PROVIDER:", process.env.NEXT_PUBLIC_USE_NEW_PROVIDER);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
