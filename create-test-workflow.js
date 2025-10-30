const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { 연락처: '01098979834', 이름: '이재호' }
    });

    if (!user) {
      console.error('❌ 사용자 없음');
      return;
    }

    console.log('✅ 사용자:', user.이름);

    let workflow = await prisma.workflow.findFirst({
      where: { userId: user.id, type: '명함' }
    });

    const testUrl = 'https://via.placeholder.com/800x400/4A90E2/ffffff?text=명함+시안+예시';

    if (workflow) {
      workflow = await prisma.workflow.update({
        where: { id: workflow.id },
        data: { status: '시안확인', 시안URL: testUrl, 시안업로드일: new Date() }
      });
    } else {
      workflow = await prisma.workflow.create({
        data: {
          userId: user.id,
          type: '명함',
          status: '시안확인',
          시안URL: testUrl,
          시안업로드일: new Date()
        }
      });
    }

    await prisma.designHistory.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        fileUrl: testUrl,
        uploadedBy: 'system',
        uploadedByName: '시스템'
      }
    });

    console.log('✅ 완료! 워크플로우 ID:', workflow.id);
    console.log('🎯 http://localhost:3005 → 01098979834/4301 로그인 → 피드백 테스트!');

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
