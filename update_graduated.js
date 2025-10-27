const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateGraduated() {
  const result = await prisma.user.update({
    where: {
      이름: "이재호"
    },
    data: {
      isGraduated: true
    }
  });
  
  console.log('✅ 이재호님 isGraduated 업데이트 완료:', result.isGraduated);
  
  await prisma.$disconnect();
}

updateGraduated();
