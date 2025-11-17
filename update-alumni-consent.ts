/**
 * 수료생 SMS/이메일 수신 동의 상태 업데이트 스크립트
 * 최윤경, 김수빈 사용자의 동의 상태를 true로 변경
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function updateAlumniConsent() {
  try {
    console.log("🔄 수료생 동의 상태 업데이트 시작...\n")

    // 업데이트할 사용자 이름 목록
    const names = ["박민재", "정승화"]

    for (const name of names) {
      // 사용자 찾기
      const user = await prisma.user.findFirst({
        where: { 이름: name },
      })

      if (!user) {
        console.log(`❌ "${name}" 사용자를 찾을 수 없습니다.`)
        continue
      }

      // 현재 상태 출력
      console.log(`👤 ${name} (${user.email})`)
      console.log(`   현재 상태:`)
      console.log(`   - SMS수신동의: ${user.SMS수신동의}`)
      console.log(`   - 이메일수신동의: ${user.이메일수신동의}`)

      // 동의 상태 업데이트
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          SMS수신동의: true,
          이메일수신동의: true,
        },
      })

      console.log(`   ✅ 업데이트 완료:`)
      console.log(`   - SMS수신동의: ${updated.SMS수신동의}`)
      console.log(`   - 이메일수신동의: ${updated.이메일수신동의}\n`)
    }

    console.log("✨ 모든 업데이트가 완료되었습니다!")
  } catch (error) {
    console.error("❌ 오류 발생:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
updateAlumniConsent()
  .then(() => {
    console.log("\n✅ 스크립트 실행 완료")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error)
    process.exit(1)
  })
