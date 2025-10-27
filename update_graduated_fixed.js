const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateGraduated() {
  // 먼저 사용자 찾기
  const user = await prisma.user.findFirst({
    where: {
      이름: "이재호"
    }
  });
  
  if (!user) {
    console.log('❌ 이재호님을 찾을 수 없습니다');
    return;
  }
  
  console.log('찾은 사용자:', {
    id: user.id,
    email: user.email,
    이름: user.이름,
    isGraduated: user.isGraduated
  });
  
  // ID로 업데이트
  const result = await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      isGraduated: true
    }
  });
  
  console.log('✅ isGraduated 업데이트 완료:', result.isGraduated);
  
  await prisma.$disconnect();
}

updateGraduated();
