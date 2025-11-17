import prisma from './lib/prisma.js';

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { 이름: '조재현' },
    include: {
      workflows: true,
      cohort: true,
    }
  });

  if (!user) {
    console.log('조재현님을 찾을 수 없습니다.');
    return;
  }

  console.log('사용자 정보:');
  console.log('- ID:', user.id);
  console.log('- 이메일:', user.email);
  console.log('- 기수:', user.cohort.name);
  console.log('- 가입일:', user.createdAt);
  console.log('- 워크플로우 개수:', user.workflows.length);

  if (user.workflows.length > 0) {
    console.log('\n워크플로우 목록:');
    user.workflows.forEach(w => {
      console.log(`  - ${w.type}: ${w.status}`);
    });
  } else {
    console.log('\n⚠️ 워크플로우가 없습니다!');

    // 워크플로우 생성
    console.log('\n워크플로우 생성 중...');
    await prisma.workflow.createMany({
      data: [
        { userId: user.id, type: "명함", status: "대기" },
        { userId: user.id, type: "명찰", status: "대기" },
        { userId: user.id, type: "대봉투", status: "대기" },
        { userId: user.id, type: "자문계약서 표지", status: "대기" },
        { userId: user.id, type: "자문계약서 내지", status: "대기" },
        { userId: user.id, type: "홈페이지", status: "대기" },
      ],
    });
    console.log('✅ 워크플로우 6개 생성 완료!');
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch(console.error);
