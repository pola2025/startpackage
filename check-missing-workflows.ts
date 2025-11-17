import prisma from './lib/prisma.js';

async function checkMissingWorkflows() {
  // 모든 사용자 조회
  const users = await prisma.user.findMany({
    include: {
      workflows: true,
      cohort: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`총 사용자 수: ${users.length}\n`);

  // 워크플로우가 6개 미만인 사용자 찾기
  const usersWithMissingWorkflows = users.filter(user => user.workflows.length < 6);

  if (usersWithMissingWorkflows.length === 0) {
    console.log('✅ 모든 사용자가 6개의 워크플로우를 가지고 있습니다.');
    return;
  }

  console.log(`⚠️ 워크플로우가 누락된 사용자: ${usersWithMissingWorkflows.length}명\n`);

  // 표준 워크플로우 타입
  const standardWorkflows = ["명함", "명찰", "대봉투", "자문계약서 표지", "자문계약서 내지", "홈페이지"];

  for (const user of usersWithMissingWorkflows) {
    console.log('---');
    console.log(`이름: ${user.이름}`);
    console.log(`이메일: ${user.email}`);
    console.log(`기수: ${user.cohort.name}`);
    console.log(`가입일: ${user.createdAt.toISOString().split('T')[0]}`);
    console.log(`현재 워크플로우 개수: ${user.workflows.length}`);

    // 현재 가지고 있는 워크플로우 타입
    const currentWorkflowTypes = user.workflows.map(w => w.type);
    console.log(`현재 워크플로우: ${currentWorkflowTypes.join(', ') || '없음'}`);

    // 누락된 워크플로우 타입
    const missingTypes = standardWorkflows.filter(type => !currentWorkflowTypes.includes(type));
    console.log(`누락된 워크플로우: ${missingTypes.join(', ')}`);

    // 추가 워크플로우 (표준이 아닌 것)
    const extraTypes = currentWorkflowTypes.filter(type => !standardWorkflows.includes(type));
    if (extraTypes.length > 0) {
      console.log(`추가 워크플로우: ${extraTypes.join(', ')}`);
    }
    console.log('');
  }

  console.log('\n=== 요약 ===');
  console.log(`총 사용자: ${users.length}명`);
  console.log(`정상 사용자: ${users.length - usersWithMissingWorkflows.length}명`);
  console.log(`워크플로우 누락: ${usersWithMissingWorkflows.length}명`);
}

checkMissingWorkflows()
  .then(() => process.exit(0))
  .catch(console.error);
