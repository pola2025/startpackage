import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const names = ['김지완', '정승화', '이빈', '유희강', '안정현'];

  console.log('=== 발송 대상자 정보 조회 ===\n');

  for (const name of names) {
    const users = await prisma.user.findMany({
      where: { 이름: { contains: name } },
      select: {
        id: true,
        이름: true,
        연락처: true,
        email: true,
        adAutomationEnabled: true,
        adAutomationEndDate: true,
      }
    });

    if (users.length > 0) {
      users.forEach(u => {
        const endDate = u.adAutomationEndDate
          ? new Date(u.adAutomationEndDate).toLocaleDateString('ko-KR')
          : '-';
        console.log(`이름: ${u.이름}`);
        console.log(`연락처: ${u.연락처 || '없음'}`);
        console.log(`이메일: ${u.email || '없음'}`);
        console.log(`자동화 활성: ${u.adAutomationEnabled ? 'O' : 'X'}`);
        console.log(`만료일: ${endDate}`);
        console.log('---');
      });
    } else {
      console.log(`이름: ${name}`);
      console.log('조회 결과 없음');
      console.log('---');
    }
  }

  await prisma.$disconnect();
}

main();
