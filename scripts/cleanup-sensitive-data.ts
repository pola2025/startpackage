/**
 * 기존 민감 정보 정리 스크립트
 * - R2에 저장된 민감 파일 삭제
 * - DB에서 URL 필드를 null로 업데이트
 *
 * 실행: npx tsx scripts/cleanup-sensitive-data.ts
 */

import prisma from "../lib/prisma";
import { deleteFromR2 } from "../lib/storage/r2Client";
import { SENSITIVE_FIELDS } from "../lib/constants/sensitiveFields";

async function cleanupSensitiveData() {
  console.log("🔐 민감 정보 정리 시작...\n");
  console.log(`대상 필드: ${SENSITIVE_FIELDS.join(", ")}\n`);

  // 1. 민감 정보가 있는 모든 submission 조회
  const submissions = await prisma.submission.findMany({
    where: {
      OR: [
        { 대표자신분증URL: { not: null } },
        { 통신서비스이용증명원URL: { not: null } },
        { 신용카드앞면URL: { not: null } },
      ],
    },
    include: {
      user: {
        select: { id: true, 이름: true, slackChannelId: true },
      },
    },
  });

  console.log(`📊 민감 정보가 있는 submission: ${submissions.length}개\n`);

  if (submissions.length === 0) {
    console.log("✅ 정리할 민감 정보가 없습니다.");
    return;
  }

  let deletedR2Count = 0;
  let updatedDbCount = 0;
  const errors: string[] = [];

  for (const sub of submissions) {
    console.log(`\n👤 ${sub.user.이름} (${sub.userId})`);

    const urlsToDelete: { field: string; url: string }[] = [];

    // 각 민감 필드 확인
    if (sub.대표자신분증URL && sub.대표자신분증URL !== "SLACK_ONLY") {
      urlsToDelete.push({ field: "대표자신분증URL", url: sub.대표자신분증URL });
    }
    if (sub.통신서비스이용증명원URL && sub.통신서비스이용증명원URL !== "SLACK_ONLY") {
      urlsToDelete.push({ field: "통신서비스이용증명원URL", url: sub.통신서비스이용증명원URL });
    }
    if (sub.신용카드앞면URL && sub.신용카드앞면URL !== "SLACK_ONLY") {
      urlsToDelete.push({ field: "신용카드앞면URL", url: sub.신용카드앞면URL });
    }

    if (urlsToDelete.length === 0) {
      console.log("  ⏭️ 이미 정리됨 (SLACK_ONLY 또는 null)");
      continue;
    }

    // R2에서 파일 삭제
    for (const { field, url } of urlsToDelete) {
      console.log(`  - ${field}: ${url.substring(0, 60)}...`);
      try {
        await deleteFromR2(url);
        console.log(`    ✅ R2 삭제 완료`);
        deletedR2Count++;
      } catch (error: any) {
        const errorMsg = `${sub.user.이름} - ${field}: ${error.message}`;
        console.error(`    ❌ R2 삭제 실패: ${error.message}`);
        errors.push(errorMsg);
      }
    }

    // DB에서 URL을 null로 업데이트
    try {
      await prisma.submission.update({
        where: { id: sub.id },
        data: {
          대표자신분증URL: null,
          통신서비스이용증명원URL: null,
          신용카드앞면URL: null,
        },
      });
      console.log(`  ✅ DB 정리 완료 (URL → null)`);
      updatedDbCount++;
    } catch (error: any) {
      console.error(`  ❌ DB 업데이트 실패: ${error.message}`);
      errors.push(`${sub.user.이름} - DB 업데이트: ${error.message}`);
    }
  }

  // 결과 출력
  console.log("\n" + "=".repeat(50));
  console.log("📊 정리 결과");
  console.log("=".repeat(50));
  console.log(`✅ R2 파일 삭제: ${deletedR2Count}개`);
  console.log(`✅ DB 업데이트: ${updatedDbCount}개`);

  if (errors.length > 0) {
    console.log(`\n⚠️ 오류 발생: ${errors.length}건`);
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  console.log("\n✅ 민감 정보 정리 완료!");
}

// 실행
cleanupSensitiveData()
  .catch((error) => {
    console.error("❌ 스크립트 실행 오류:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
