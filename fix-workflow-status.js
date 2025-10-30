const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStatus() {
  try {
    const user = await prisma.user.findFirst({
      where: { 연락처: '01012341234' }
    });

    const workflow = await prisma.workflow.findFirst({
      where: { userId: user.id, type: '명함' }
    });

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: '발주대기' }
    });

    console.log('✅ 워크플로우 상태 변경: 시안확인 → 발주대기');
    console.log('🎯 이제 새로고침하고 명함 카드를 클릭하세요!');

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixStatus();
