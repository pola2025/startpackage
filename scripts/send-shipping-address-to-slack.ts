/**
 * 기존 사용자의 배송받을곳 주소를 슬랙에 전송하는 스크립트
 *
 * 사용법:
 * npx tsx scripts/send-shipping-address-to-slack.ts
 */

import { PrismaClient } from "@prisma/client";
import { postMessage } from "@/lib/notification/slackClient";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 배송받을곳 주소 슬랙 전송 시작...\n");

  try {
    // 배송받을곳 주소가 있고 슬랙 채널이 있는 사용자 조회
    const submissions = await prisma.submission.findMany({
      where: {
        인쇄물받을주소: {
          not: null,
        },
        user: {
          slackChannelId: {
            not: null,
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
          },
        },
      },
    });

    console.log(`✅ 총 ${submissions.length}명의 사용자에게 배송 주소 정보가 있습니다.\n`);

    if (submissions.length === 0) {
      console.log("ℹ️ 전송할 배송 주소가 없습니다.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 각 사용자에게 배송 주소 전송
    for (const submission of submissions) {
      const { user, 인쇄물받을주소 } = submission;

      if (!user.slackChannelId || !인쇄물받을주소) {
        continue;
      }

      try {
        console.log(`📤 전송 중: ${user.이름} (${user.email})`);
        console.log(`   주소: ${인쇄물받을주소}`);

        const result = await postMessage({
          channelId: user.slackChannelId,
          text: `✨ 배송받을곳 주소`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "📦 배송받을곳 주소 (기존 데이터)",
              },
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*배송받을곳 주소:*\n✨ *${인쇄물받을주소}* (기존 데이터)`,
                },
              ],
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (스크립트 실행)`,
                },
              ],
            },
          ],
        });

        if (result) {
          console.log(`✅ 전송 성공: ${user.이름}\n`);
          successCount++;
        } else {
          console.error(`❌ 전송 실패: ${user.이름}\n`);
          failCount++;
        }

        // 슬랙 API rate limit 방지 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ 전송 오류: ${user.이름}`, error);
        failCount++;
      }
    }

    console.log("\n📊 전송 완료!");
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
