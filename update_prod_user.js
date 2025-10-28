const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.production' });

const prisma = new PrismaClient();

async function updateGraduated() {
  console.log('🔍 프로덕션 DB 연결 중...');
  
  // 먼저 사용자 찾기
  const user = await prisma.user.findFirst({
    where: {
      이름: "이재호"
    },
    include: {
      cohort: true
    }
  });
  
  if (!user) {
    console.log('❌ 이재호님을 찾을 수 없습니다');
    await prisma.$disconnect();
    return;
  }
  
  console.log('✅ 찾은 사용자:', {
    id: user.id,
    email: user.email,
    이름: user.이름,
    cohort: user.cohort?.name,
    isGraduated: user.isGraduated
  });
  
  if (user.isGraduated) {
    console.log('✅ 이미 수료생으로 설정되어 있습니다');
    await prisma.$disconnect();
    return;
  }
  
  // ID로 업데이트
  const result = await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      isGraduated: true
    }
  });
  
  console.log('✅ 프로덕션 DB 업데이트 완료!');
  console.log('   isGraduated:', result.isGraduated);
  console.log('');
  console.log('🎉 이재호님이 로그아웃 후 재로그인하면 /graduated로 리다이렉트됩니다!');
  
  await prisma.$disconnect();
}

updateGraduated().catch(e => {
  console.error('❌ 에러:', e);
  process.exit(1);
});
