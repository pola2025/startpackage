/**
 * 기존 시안중 워크플로우를 DesignThread로 마이그레이션하는 스크립트
 *
 * 실행: npx tsx scripts/migrate-workflows-to-design-threads.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== 시안중 워크플로우 → DesignThread 마이그레이션 ===\n");

  // 시안 관련 워크플로우 조회 (시안URL이 있거나 시안중/발주대기 상태)
  const workflows = await prisma.workflow.findMany({
    where: {
      OR: [
        { status: "시안중" },
        { status: "발주대기" },
        { 시안URL: { not: null } },
      ],
    },
    include: {
      user: {
        select: { id: true, 이름: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`총 ${workflows.length}개 워크플로우 발견\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const wf of workflows) {
    const userName = wf.user?.이름 || "알 수 없음";

    try {
      // 이미 DesignThread가 있는지 확인
      const existingThread = await prisma.designThread.findUnique({
        where: { workflowId: wf.id },
      });

      if (existingThread) {
        console.log(`[SKIP] ${userName} - ${wf.type}: 이미 존재 (${existingThread.status})`);
        skipped++;
        continue;
      }

      // 워크플로우 상태에 따른 DesignThread 상태 매핑
      let threadStatus = "pending";
      const revisionCount = wf.수정횟수 || 0;
      const hasDesignUrl = !!wf.시안URL;

      if (wf.status === "최종확정" || wf.status === "발송완료" || wf.status === "제작 완료") {
        threadStatus = "confirmed";
      } else if (wf.status === "발주대기") {
        threadStatus = "uploaded"; // 클라이언트 확인 필요
      } else if (wf.status === "시안중") {
        if (hasDesignUrl) {
          threadStatus = "uploaded"; // 시안 업로드됨, 확인 필요
        } else {
          threadStatus = "pending"; // 시안 대기 중
        }
      }

      // DesignThread 생성
      const thread = await prisma.designThread.create({
        data: {
          workflowId: wf.id,
          status: threadStatus,
          currentVersion: hasDesignUrl ? Math.max(1, revisionCount) : 0,
          confirmedAt: threadStatus === "confirmed" ? new Date() : null,
          confirmedByName: threadStatus === "confirmed" ? userName : null,
        },
      });

      // 시안URL이 있으면 첫 번째 시안 업로드 메시지 생성
      if (hasDesignUrl) {
        await prisma.designThreadMessage.create({
          data: {
            threadId: thread.id,
            authorId: "system",
            authorType: "admin",
            authorName: "시스템 (마이그레이션)",
            messageType: "design_upload",
            content: `기존 시안 마이그레이션 (${wf.시안업로드일 ? new Date(wf.시안업로드일).toLocaleDateString("ko-KR") : "날짜 없음"})`,
            attachments: [],
            designVersion: Math.max(1, revisionCount),
            designUrl: wf.시안URL,
            isReadByAdmin: true,
            isReadByUser: threadStatus === "confirmed",
          },
        });
      }

      console.log(`[CREATE] ${userName} - ${wf.type}: ${threadStatus} (버전: ${thread.currentVersion})`);
      created++;
    } catch (error) {
      console.error(`[ERROR] ${userName} - ${wf.type}:`, error);
      errors++;
    }
  }

  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`생성: ${created}개`);
  console.log(`건너뜀: ${skipped}개`);
  console.log(`오류: ${errors}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
