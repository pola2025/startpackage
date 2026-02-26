import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('테스트 계정 생성 시작...');

  // 테스트 기수 생성
  const cohort = await prisma.cohort.upsert({
    where: { name: '테스트기수' },
    update: {},
    create: {
      name: '테스트기수',
      교육시작일: new Date(),
      교육요일: '월',
      자료제출마감일: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log('기수 생성:', cohort.name);

  // 테스트 사용자 생성 (비밀번호: 1234)
  const hashedPassword = await bcrypt.hash('1234', 10);

  const user = await prisma.user.upsert({
    where: { 연락처: '01012341234' },
    update: { password: hashedPassword },
    create: {
      연락처: '01012341234',
      password: hashedPassword,
      이름: '테스트유저',
      email: 'test@test.com',
      cohortId: cohort.id,
    },
  });

  console.log('');
  console.log('========================================');
  console.log('테스트 계정 생성 완료!');
  console.log('========================================');
  console.log('연락처: 01012341234');
  console.log('비밀번호: 1234');
  console.log('========================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
