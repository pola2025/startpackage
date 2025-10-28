// 마이그레이션 검증 스크립트
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔍 마이그레이션 검증 시작...\n")

  // 1. 사용자 통계
  const totalUsers = await prisma.user.count()
  const activeUsers = await prisma.user.count({ where: { status: "active" } })
  const graduatedUsers = await prisma.user.count({ where: { status: "graduated" } })
  const inactiveUsers = await prisma.user.count({ where: { status: "inactive" } })

  console.log("📊 사용자 통계:")
  console.log(`  - 전체: ${totalUsers}명`)
  console.log(`  - 현재 수강생 (active): ${activeUsers}명`)
  console.log(`  - 수료생 (graduated): ${graduatedUsers}명`)
  console.log(`  - 비활성 (inactive): ${inactiveUsers}명`)

  // 2. 샘플 데이터 확인
  const sampleUsers = await prisma.user.findMany({
    select: {
      email: true,
      status: true,
      graduatedAt: true,
    },
    take: 5
  })

  console.log("\n📝 샘플 데이터:")
  sampleUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email}`)
    console.log(`     - status: ${user.status}`)
    console.log(`     - graduatedAt: ${user.graduatedAt || 'null'}`)
  })

  console.log("\n✅ 검증 완료!")
}

main()
  .catch((e) => {
    console.error("\n❌ 검증 실패:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
