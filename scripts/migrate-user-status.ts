// 사용자 상태 데이터 마이그레이션 스크립트
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 사용자 상태 마이그레이션 시작...")

  // 1. 현재 상태 확인
  const totalUsers = await prisma.user.count()
  const usersWithoutStatus = await prisma.user.count({
    where: { status: null }
  })

  console.log(`\n📊 현재 상태:`)
  console.log(`  - 전체 사용자: ${totalUsers}명`)
  console.log(`  - status 미설정: ${usersWithoutStatus}명`)

  if (usersWithoutStatus === 0) {
    console.log("\n✅ 이미 모든 사용자에게 status가 설정되어 있습니다.")
    return
  }

  // 2. isGraduated = false → status = 'active'
  const activeResult = await prisma.user.updateMany({
    where: {
      isGraduated: false,
      status: null
    },
    data: {
      status: "active"
    }
  })

  console.log(`\n✅ ${activeResult.count}명을 'active'로 변환`)

  // 3. isGraduated = true → status = 'graduated'
  const graduatedResult = await prisma.user.updateMany({
    where: {
      isGraduated: true,
      status: null
    },
    data: {
      status: "graduated",
      graduatedAt: new Date()
    }
  })

  console.log(`✅ ${graduatedResult.count}명을 'graduated'로 변환 (수료일: ${new Date().toISOString()})`)

  // 4. 검증
  const remainingNull = await prisma.user.count({
    where: { status: null }
  })

  if (remainingNull > 0) {
    console.error(`\n❌ 오류: ${remainingNull}명의 사용자에게 여전히 status가 없습니다.`)
    process.exit(1)
  }

  // 5. 결과 확인
  const statusCounts = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT "status", COUNT(*) as count
    FROM "users"
    GROUP BY "status"
    ORDER BY "status"
  `

  console.log(`\n📊 마이그레이션 결과:`)
  statusCounts.forEach(row => {
    console.log(`  - ${row.status}: ${row.count}명`)
  })

  console.log(`\n✅ 마이그레이션 완료!`)
}

main()
  .catch((e) => {
    console.error("\n❌ 마이그레이션 실패:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
