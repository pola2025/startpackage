// 완료 예상일 데이터 마이그레이션: Thread → Message
// 기존 스레드에 저장된 expectedCompletionDate를 해당 스레드의 첫 번째 관리자 메시지로 이동

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateCompletionDates() {
  try {
    console.log("🔄 완료 예상일 마이그레이션 시작...");

    // expectedCompletionDate가 있는 스레드 찾기
    const threadsWithDates = await prisma.communicationThread.findMany({
      where: {
        expectedCompletionDate: {
          not: null,
        },
      },
      include: {
        messages: {
          where: {
            authorType: "admin",
          },
          orderBy: {
            createdAt: "asc",
          },
          take: 1, // 첫 번째 관리자 메시지만
        },
      },
    });

    console.log(`📊 마이그레이션 대상 스레드: ${threadsWithDates.length}개`);

    let successCount = 0;
    let skipCount = 0;

    for (const thread of threadsWithDates) {
      if (thread.messages.length === 0) {
        console.log(`⚠️  스레드 ${thread.id}: 관리자 메시지 없음 - 건너뜀`);
        skipCount++;
        continue;
      }

      const firstAdminMessage = thread.messages[0];

      // 메시지에 완료 예상일 업데이트
      await prisma.communicationMessage.update({
        where: {
          id: firstAdminMessage.id,
        },
        data: {
          expectedCompletionDate: thread.expectedCompletionDate,
        },
      });

      console.log(`✅ 스레드 ${thread.id}: ${thread.expectedCompletionDate?.toISOString()} → 메시지 ${firstAdminMessage.id}로 이동`);
      successCount++;
    }

    console.log("\n📈 마이그레이션 완료:");
    console.log(`   - 성공: ${successCount}개`);
    console.log(`   - 건너뜀: ${skipCount}개`);
    console.log(`   - 총: ${threadsWithDates.length}개`);

    console.log("\n✨ 마이그레이션 성공!");
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateCompletionDates();
