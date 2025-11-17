import prisma from './lib/prisma.js';

async function fixWorkflows() {
  console.log('=== 1단계: 유희강님 수료생으로 변경 ===\n');

  const yhk = await prisma.user.findFirst({
    where: { 이름: '유희강', email: 'yhk7205@naver.com' }
  });

  if (yhk) {
    await prisma.user.update({
      where: { id: yhk.id },
      data: {
        status: 'graduated',
        graduatedAt: new Date()
      }
    });
    console.log('✅ 유희강님 수료생으로 변경 완료\n');
  }

  console.log('=== 2단계: 누락된 워크플로우 생성 ===\n');

  // 표준 워크플로우 타입
  const standardWorkflows = ["명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지", "홈페이지"];

  // 현재 수강생 중 워크플로우가 누락된 사용자
  const targetUsers = [
    { 이름: '조재현', email: 'jjapk1@naver.com' },
    { 이름: '임효정', email: 'wisen5447@gmail.com' },
    { 이름: '이다정', email: 'dj12390@naver.com' },
  ];

  for (const userData of targetUsers) {
    const user = await prisma.user.findFirst({
      where: { 이름: userData.이름, email: userData.email },
      include: { workflows: true }
    });

    if (!user) {
      console.log(`⚠️  ${userData.이름}님을 찾을 수 없습니다.`);
      continue;
    }

    // 현재 가지고 있는 워크플로우 타입
    const currentWorkflowTypes = user.workflows.map(w => w.type);

    // 누락된 워크플로우 타입
    const missingTypes = standardWorkflows.filter(type => !currentWorkflowTypes.includes(type));

    if (missingTypes.length === 0) {
      console.log(`✅ ${user.이름}님: 누락된 워크플로우 없음`);
      continue;
    }

    console.log(`🔧 ${user.이름}님: ${missingTypes.join(', ')} 생성 중...`);

    // 누락된 워크플로우 생성
    await prisma.workflow.createMany({
      data: missingTypes.map(type => ({
        userId: user.id,
        type,
        status: '대기'
      }))
    });

    console.log(`✅ ${user.이름}님: ${missingTypes.length}개 워크플로우 생성 완료\n`);
  }

  console.log('\n=== 완료 ===');

  // 결과 확인
  console.log('\n=== 결과 확인 ===\n');

  for (const userData of targetUsers) {
    const user = await prisma.user.findFirst({
      where: { 이름: userData.이름, email: userData.email },
      include: { workflows: true }
    });

    if (user) {
      console.log(`${user.이름}: ${user.workflows.length}개 워크플로우`);
      console.log(`  타입: ${user.workflows.map(w => w.type).join(', ')}`);
    }
  }
}

fixWorkflows()
  .then(() => process.exit(0))
  .catch(console.error);
