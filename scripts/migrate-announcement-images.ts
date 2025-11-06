// 기존 imageUrl을 imageUrls 배열로 마이그레이션하는 스크립트
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 마이그레이션 시작: imageUrl → imageUrls')

  // imageUrl이 있고 imageUrls가 비어있는 공지사항 찾기
  const announcements = await prisma.announcement.findMany({
    where: {
      imageUrl: {
        not: null
      }
    }
  })

  console.log(`📊 마이그레이션 대상: ${announcements.length}개`)

  for (const announcement of announcements) {
    if (announcement.imageUrl) {
      // imageUrl을 imageUrls 배열에 추가
      await prisma.announcement.update({
        where: {
          id: announcement.id
        },
        data: {
          imageUrls: [announcement.imageUrl]
        }
      })

      console.log(`✅ ${announcement.id}: imageUrl → imageUrls 변환 완료`)
    }
  }

  console.log('✅ 마이그레이션 완료!')
  console.log('ℹ️  다음 단계: schema.prisma에서 imageUrl 필드 제거 후 npx prisma db push')
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 실패:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
