/**
 * 슬랙 알림 테스트 스크립트
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createSlackChannel, logProgress } from "../lib/notification/slackClient";

async function testSlackNotification() {
  console.log("🧪 슬랙 알림 테스트 시작...\n");
  console.log("환경변수 확인:");
  console.log(`SLACK_BOT_TOKEN: ${process.env.SLACK_BOT_TOKEN ? "설정됨" : "미설정"}\n`);

  // 봇 정보 확인
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(process.env.SLACK_BOT_TOKEN);

  try {
    const authTest = await client.auth.test();
    console.log("봇 정보:");
    console.log(`- 봇 이름: ${authTest.user}`);
    console.log(`- 워크스페이스: ${authTest.team}`);
    console.log(`- 봇 ID: ${authTest.user_id}\n`);
  } catch (error: any) {
    console.error("봇 정보 확인 실패:", error.message);
  }

  // 1. 채널 생성 테스트
  console.log("1️⃣ 채널 생성 테스트");
  const timestamp = Date.now().toString().slice(-6);
  const channelId = await createSlackChannel({
    cohortName: "cohort21",
    userName: "hong",
    brandName: `brand${timestamp}`,
    userEmail: "test@example.com",
    userPhone: "010-1234-5678",
  });

  if (!channelId) {
    console.error("❌ 채널 생성 실패");
    return;
  }

  console.log(`✅ 채널 생성 성공: ${channelId}`);

  // 채널 정보 가져오기
  try {
    const channelInfo = await client.conversations.info({ channel: channelId });
    console.log(`📍 채널 이름: ${channelInfo.channel?.name}`);
    console.log(`🔗 채널 URL: https://app.slack.com/client/${authTest.team_id}/${channelId}\n`);
  } catch (error: any) {
    console.error("채널 정보 조회 실패:", error.message);
  }

  // 2. 진행 상황 로그 테스트
  console.log("2️⃣ 진행 상황 로그 테스트");
  const logResult = await logProgress({
    channelId,
    stage: "로고 시안 제작",
    status: "진행 중",
    details: {
      담당자: "디자이너 김철수",
      예상완료일: "2025-01-30",
    },
    emoji: "🎨",
  });

  if (logResult) {
    console.log("✅ 진행 상황 로그 성공\n");
  } else {
    console.error("❌ 진행 상황 로그 실패\n");
  }

  console.log("🎉 슬랙 알림 테스트 완료!");
  console.log(`\n슬랙 워크스페이스에서 채널을 확인하세요!`);
}

testSlackNotification().catch(console.error);
