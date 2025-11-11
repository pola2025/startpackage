/**
 * 사용자 워크플로우 누락 방지 유틸리티
 *
 * 사용자가 로그인하거나 대시보드에 접속할 때
 * 필수 워크플로우가 모두 생성되어 있는지 확인하고
 * 누락된 워크플로우가 있으면 자동으로 생성합니다.
 */

import prisma from './prisma';

// 표준 워크플로우 타입 (신규 가입자가 가져야 할 워크플로우)
const STANDARD_WORKFLOWS = [
  "명함",
  "명찰",
  "대봉투",
  "자문계약서 표지",
  "자문계약서 내지",
  "홈페이지"
] as const;

/**
 * 사용자의 워크플로우를 확인하고 누락된 경우 생성
 *
 * @param userId - 사용자 ID
 * @returns 생성된 워크플로우 개수
 */
export async function ensureUserWorkflows(userId: string): Promise<number> {
  try {
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { workflows: true }
    });

    if (!user) {
      console.error(`[ensureUserWorkflows] 사용자를 찾을 수 없음: ${userId}`);
      return 0;
    }

    // 수료생은 워크플로우 체크 건너뜀
    if (user.status === 'graduated' || user.status === 'inactive') {
      return 0;
    }

    // 현재 가지고 있는 워크플로우 타입
    const currentWorkflowTypes = user.workflows.map(w => w.type);

    // 누락된 워크플로우 타입 찾기
    const missingTypes = STANDARD_WORKFLOWS.filter(
      type => !currentWorkflowTypes.includes(type)
    );

    // 누락된 워크플로우가 없으면 종료
    if (missingTypes.length === 0) {
      return 0;
    }

    console.log(`[ensureUserWorkflows] ${user.이름}님 워크플로우 누락 발견:`, missingTypes);

    // 누락된 워크플로우 생성
    await prisma.workflow.createMany({
      data: missingTypes.map(type => ({
        userId: user.id,
        type,
        status: '대기'
      })),
      skipDuplicates: true // 중복 생성 방지
    });

    console.log(`[ensureUserWorkflows] ${user.이름}님 워크플로우 ${missingTypes.length}개 생성 완료`);

    return missingTypes.length;
  } catch (error) {
    console.error('[ensureUserWorkflows] 워크플로우 생성 실패:', error);
    return 0;
  }
}

/**
 * 여러 사용자의 워크플로우를 일괄 확인
 *
 * @param userIds - 사용자 ID 배열
 * @returns 총 생성된 워크플로우 개수
 */
export async function ensureMultipleUserWorkflows(userIds: string[]): Promise<number> {
  let totalCreated = 0;

  for (const userId of userIds) {
    const created = await ensureUserWorkflows(userId);
    totalCreated += created;
  }

  return totalCreated;
}
