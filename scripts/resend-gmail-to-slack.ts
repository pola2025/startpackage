/**
 * 26-2기 / 2기 사용자의 Gmail 계정정보(ID+실제 PW)를 슬랙에 재전송
 *
 * 이전에는 "비밀번호: 등록됨"으로 보내졌으므로, 실제 PW가 보이는 메시지로 다시 전송함.
 * (기존 "등록됨" 메시지는 그대로 남으며, 그 아래에 실제 값 메시지가 추가됨)
 *
 * 사용법:
 *   npx tsx scripts/resend-gmail-to-slack.ts --cohorts 3기                # dry-run
 *   npx tsx scripts/resend-gmail-to-slack.ts --cohorts 3기,26-2기 --execute  # 실제 전송
 */

import { PrismaClient } from "@prisma/client";
import { postMessage } from "@/lib/notification/slackClient";

const prisma = new PrismaClient();

function parseCohorts(): string[] {
  const idx = process.argv.indexOf("--cohorts");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error(
      "❌ --cohorts <기수명,...> 인자가 필요합니다. 예: --cohorts 3기,26-2기",
    );
    process.exit(1);
  }
  return process.argv[idx + 1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const isExecute = process.argv.includes("--execute");
  const TARGET_COHORT_NAMES = parseCohorts();
  const mode = isExecute ? "🚀 EXECUTE" : "🔍 DRY-RUN";
  console.log(`${mode} Gmail 재전송 스크립트 시작\n`);
  console.log(`대상 기수: ${TARGET_COHORT_NAMES.join(", ")}\n`);

  try {
    const submissions = await prisma.submission.findMany({
      where: {
        GmailID: { not: null },
        GmailPW: { not: null },
        user: {
          slackChannelId: { not: null },
          cohort: {
            name: { in: TARGET_COHORT_NAMES },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            이름: true,
            email: true,
            slackChannelId: true,
            cohort: { select: { name: true } },
          },
        },
      },
    });

    console.log(`✅ 대상자: ${submissions.length}명\n`);

    if (submissions.length === 0) {
      console.log("ℹ️ 재전송할 Gmail 정보가 없습니다.");
      return;
    }

    for (const [i, s] of submissions.entries()) {
      console.log(
        `${i + 1}. [${s.user.cohort.name}] ${s.user.이름} (${s.user.email})`,
      );
      console.log(`   GmailID: ${s.GmailID}`);
      console.log(`   GmailPW: ${s.GmailPW}`);
      console.log(`   채널ID: ${s.user.slackChannelId}`);
    }

    if (!isExecute) {
      console.log(
        "\n💡 실제 전송하려면 --execute 플래그를 붙여 다시 실행하세요.",
      );
      return;
    }

    console.log("\n📤 슬랙 전송 시작...\n");

    let successCount = 0;
    let failCount = 0;

    for (const s of submissions) {
      const { user, GmailID, GmailPW } = s;
      if (!user.slackChannelId || !GmailID || !GmailPW) continue;

      try {
        const result = await postMessage({
          channelId: user.slackChannelId,
          text: `✅ Gmail 계정 정보 (기존 데이터 재전송)`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*✅ Gmail 계정 정보*\n\n*Gmail ID:* ${GmailID}\n*비밀번호:* ${GmailPW}`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (기존 데이터 재전송)`,
                },
              ],
            },
          ],
        });

        if (result) {
          console.log(`✅ ${user.cohort.name} / ${user.이름}`);
          successCount++;
        } else {
          console.error(
            `❌ ${user.cohort.name} / ${user.이름} - postMessage returned false`,
          );
          failCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ ${user.cohort.name} / ${user.이름}`, error);
        failCount++;
      }
    }

    console.log("\n📊 전송 완료");
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${failCount}명`);
  } catch (error) {
    console.error("❌ 스크립트 실행 오류:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("\n✅ 스크립트 종료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
