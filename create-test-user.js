const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  try {
    let user = await prisma.user.findFirst({
      where: { 연락처: '01012341234' }
    });

    const hashedPassword = await bcrypt.hash('1234', 10);

    if (user) {
      console.log('✅ 기존 사용자:', user.이름);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });
    } else {
      const cohort = await prisma.cohort.findFirst({
        where: { isActive: true }
      });

      user = await prisma.user.create({
        data: {
          이름: '테스트사용자',
          연락처: '01012341234',
          email: 'test@example.com',
          password: hashedPassword,
          cohortId: cohort.id
        }
      });
      console.log('✅ 신규 사용자 생성');
    }

    let workflow = await prisma.workflow.findFirst({
      where: { userId: user.id, type: '명함' }
    });

    const url = 'https://via.placeholder.com/800x400/4A90E2/ffffff?text=명함+시안';

    if (workflow) {
      workflow = await prisma.workflow.update({
        where: { id: workflow.id },
        data: { status: '시안확인', 시안URL: url, 시안업로드일: new Date() }
      });
    } else {
      workflow = await prisma.workflow.create({
        data: {
          userId: user.id,
          type: '명함',
          status: '시안확인',
          시안URL: url,
          시안업로드일: new Date()
        }
      });
    }

    await prisma.designHistory.create({
      data: {
        workflowId: workflow.id,
        version: 1,
        fileUrl: url,
        uploadedBy: 'system',
        uploadedByName: '시스템'
      }
    });

    console.log('✅ 완료!');
    console.log('🎯 로그인: 01012341234 / 1234');

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
