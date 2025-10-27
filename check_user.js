const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: {
      이름: "이재호"
    },
    include: {
      cohort: true
    }
  });
  
  console.log('=== 이재호님 정보 ===');
  console.log('이름:', user?.이름);
  console.log('이메일:', user?.이메일);
  console.log('isGraduated:', user?.isGraduated);
  console.log('cohort name:', user?.cohort?.name);
  console.log('cohort:', JSON.stringify(user?.cohort, null, 2));
  
  await prisma.$disconnect();
}

checkUser();
