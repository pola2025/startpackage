/**
 * 슬랙 클라이언트
 * - 자료 제출 시 자동으로 채널 생성 (기수명_이름_브랜드명)
 * - 이후 모든 진행 과정을 해당 채널에 기록
 */

import { WebClient } from "@slack/web-api";

let slackClient: WebClient | null = null;

/**
 * 슬랙 클라이언트 초기화
 */
function initSlackClient() {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

  if (!slackClient && SLACK_BOT_TOKEN) {
    try {
      slackClient = new WebClient(SLACK_BOT_TOKEN);
    } catch (error) {
      console.error("슬랙 클라이언트 초기화 실패:", error);
    }
  }
  return slackClient;
}

/**
 * 채널 이름 생성 (영문명 사용: 19th_leejaeho_polarad)
 * 슬랙 채널 이름 규칙: 소문자, 숫자, 하이픈, 언더스코어만 허용
 */
function generateChannelName(
  cohortName: string,
  userName: string,
  brandName: string
): string {
  const sanitized = `${cohortName}_${userName}_${brandName}`
    .toLowerCase()
    .replace(/\s+/g, "_") // 공백을 언더스코어로
    .replace(/[^a-z0-9_\-]/g, "") // 영문, 숫자, 하이픈, 언더스코어만 허용
    .substring(0, 80); // 슬랙 채널 이름 최대 길이 제한

  return sanitized;
}

/**
 * 이메일로 슬랙 사용자 ID 찾기
 */
async function findUserByEmail(email: string): Promise<string | null> {
  try {
    const client = initSlackClient();
    if (!client || !email) {
      return null;
    }

    const result = await client.users.lookupByEmail({ email });
    return result.user?.id || null;
  } catch (error) {
    console.error("사용자 검색 실패:", error);
    return null;
  }
}

/**
 * 슬랙 채널 생성
 */
export async function createSlackChannel(params: {
  cohortName: string;
  userName: string;
  brandName: string;
  userEmail: string;
  userPhone: string;
}): Promise<string | null> {
  try {
    const client = initSlackClient();

    if (!client) {
      console.error("슬랙 클라이언트가 초기화되지 않았습니다");
      return null;
    }

    const channelName = generateChannelName(
      params.cohortName,
      params.userName,
      params.brandName
    );

    // 기존 채널 확인
    const existingChannel = await findChannelByName(channelName);
    if (existingChannel) {
      console.log(`✅ 기존 채널 사용: ${channelName}`);
      return existingChannel;
    }

    // 새 채널 생성
    const result = await client.conversations.create({
      name: channelName,
      is_private: false,
    });

    if (!result.ok || !result.channel?.id) {
      throw new Error("채널 생성 실패");
    }

    const channelId = result.channel.id;

    // 관리자들을 채널에 초대
    const adminEmails = process.env.SLACK_ADMIN_EMAILS;
    const invitedUserIds: string[] = [];

    if (adminEmails) {
      const emails = adminEmails.split(",").map(e => e.trim());

      for (const email of emails) {
        const userId = await findUserByEmail(email);
        if (userId) {
          try {
            await client.conversations.invite({
              channel: channelId,
              users: userId,
            });
            invitedUserIds.push(userId);
            console.log(`✅ 관리자(${email})를 채널에 초대했습니다`);
          } catch (error) {
            console.error(`관리자(${email}) 초대 실패:`, error);
          }
        }
      }
    }

    // 초기 메시지 전송 (자료 제출 정보 + 관리자 멘션)
    const mentionText = invitedUserIds.length > 0
      ? `\n\n👋 ${invitedUserIds.map(id => `<@${id}>`).join(" ")} 새로운 프로젝트가 시작되었습니다!`
      : "";

    await postMessage({
      channelId,
      text: `🎉 새로운 제작 프로젝트 시작${mentionText}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎉 새로운 제작 프로젝트 시작",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*기수:*\n${params.cohortName}`,
            },
            {
              type: "mrkdwn",
              text: `*이름:*\n${params.userName}`,
            },
            {
              type: "mrkdwn",
              text: `*브랜드명:*\n${params.brandName}`,
            },
            {
              type: "mrkdwn",
              text: `*연락처:*\n${params.userPhone}`,
            },
            {
              type: "mrkdwn",
              text: `*이메일:*\n${params.userEmail}`,
            },
            {
              type: "mrkdwn",
              text: `*상태:*\n자료 제출 완료 ✅`,
            },
          ],
        },
        ...(invitedUserIds.length > 0 ? [{
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `👋 ${invitedUserIds.map(id => `<@${id}>`).join(" ")} 새로운 프로젝트가 시작되었습니다!`,
          },
        }] : []),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
            },
          ],
        },
      ],
    });

    console.log(`✅ 슬랙 채널 생성 성공: ${channelName} (${channelId})`);
    return channelId;
  } catch (error) {
    console.error("슬랙 채널 생성 실패:", error);
    return null;
  }
}

/**
 * 채널 이름으로 채널 ID 찾기
 */
async function findChannelByName(
  channelName: string
): Promise<string | null> {
  try {
    const client = initSlackClient();

    if (!client) {
      return null;
    }

    const result = await client.conversations.list({
      types: "public_channel,private_channel",
      limit: 1000,
    });

    if (!result.ok || !result.channels) {
      return null;
    }

    const channel = result.channels.find((ch) => ch.name === channelName);
    return channel?.id || null;
  } catch (error) {
    console.error("채널 검색 실패:", error);
    return null;
  }
}

/**
 * 슬랙 메시지 전송
 */
export async function postMessage(params: {
  channelId: string;
  text: string;
  blocks?: any[];
}): Promise<boolean> {
  try {
    const client = initSlackClient();

    if (!client) {
      console.error("슬랙 클라이언트가 초기화되지 않았습니다");
      return false;
    }

    const result = await client.chat.postMessage({
      channel: params.channelId,
      text: params.text,
      blocks: params.blocks,
    });

    if (!result.ok) {
      throw new Error("메시지 전송 실패");
    }

    console.log(`✅ 슬랙 메시지 전송 성공: ${params.channelId}`);
    return true;
  } catch (error) {
    console.error("슬랙 메시지 전송 실패:", error);
    return false;
  }
}

/**
 * 진행 상황 업데이트 (일자와 내용 기록)
 */
export async function logProgress(params: {
  channelId: string;
  stage: string;
  status: string;
  details?: Record<string, string>;
  emoji?: string;
}): Promise<boolean> {
  const { channelId, stage, status, details, emoji = "📝" } = params;

  const fields: any[] = [
    {
      type: "mrkdwn",
      text: `*단계:*\n${stage}`,
    },
    {
      type: "mrkdwn",
      text: `*상태:*\n${status}`,
    },
  ];

  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      fields.push({
        type: "mrkdwn",
        text: `*${key}:*\n${value}`,
      });
    });
  }

  return postMessage({
    channelId,
    text: `${emoji} ${stage} - ${status}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${stage}*`,
        },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
          },
        ],
      },
      {
        type: "divider",
      },
    ],
  });
}

/**
 * 슬랙에 파일 업로드
 */
export async function uploadFileToSlack(params: {
  channelId: string;
  filePath: string;
  fileName: string;
  title: string;
}): Promise<boolean> {
  try {
    const client = initSlackClient();
    if (!client) {
      console.error("슬랙 클라이언트가 초기화되지 않았습니다");
      return false;
    }

    const fs = require("fs");
    const path = require("path");

    // 파일 경로가 /uploads/로 시작하면 public 폴더 경로로 변환
    let fullPath = params.filePath;
    if (fullPath.startsWith("/uploads/")) {
      fullPath = path.join(process.cwd(), "public", fullPath);
    }

    // 파일이 존재하는지 확인
    if (!fs.existsSync(fullPath)) {
      console.error(`파일을 찾을 수 없습니다: ${fullPath}`);
      return false;
    }

    // 실제 파일의 확장자 추출
    const actualExtension = path.extname(fullPath); // .pdf, .jpg 등
    const baseFileName = params.fileName.replace(/\.[^/.]+$/, ""); // 확장자 제거
    const finalFileName = baseFileName + actualExtension; // 실제 확장자로 조합

    // 파일 읽기
    const fileContent = fs.readFileSync(fullPath);

    console.log(`📤 파일 업로드 시도: ${finalFileName} (원본: ${fullPath})`);

    // 슬랙에 파일 업로드 (files.uploadV2 사용)
    const result = await client.files.uploadV2({
      channel_id: params.channelId,
      file: fileContent,
      filename: finalFileName,
      title: params.title,
      initial_comment: `📎 ${params.title}`,
    });

    if (result.ok && (result as any).file) {
      console.log(`✅ 파일 업로드 성공: ${params.title} (ID: ${(result as any).file.id})`);
      return true;
    } else {
      console.error(`파일 업로드 실패: ${params.title}`, result);
      return false;
    }
  } catch (error) {
    console.error(`파일 업로드 오류: ${params.title}`, error);
    return false;
  }
}

/**
 * 제작 정보 푸시 (자료 제출 완료 시)
 */
export async function pushSubmissionData(params: {
  channelId: string;
  submissionData: Record<string, any>;
}): Promise<boolean> {
  const { channelId, submissionData } = params;

  const fields: any[] = [];

  // 텍스트 정보만 필드로 추가
  const textFields = [
    { key: "브랜드명", label: "브랜드명" },
    { key: "업종", label: "업종" },
    { key: "주소", label: "주소" },
    { key: "대표번호", label: "대표번호" },
    { key: "이메일", label: "이메일" },
    { key: "홈페이지컬러컨셉", label: "홈페이지 컬러" },
    { key: "로고선호스타일", label: "로고 스타일" },
    { key: "명함색상", label: "명함 색상" },
    { key: "명함시안", label: "명함 스타일" },
  ];

  textFields.forEach(({ key, label }) => {
    const value = submissionData[key];
    if (value) {
      fields.push({
        type: "mrkdwn",
        text: `*${label}:*\n${value}`,
      });
    }
  });

  // 기본 정보 메시지 전송
  const messageResult = await postMessage({
    channelId,
    text: "📋 제작 정보",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📋 제작 정보",
        },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
          },
        ],
      },
    ],
  });

  // 초기 제작요청 시 필수 파일만 업로드
  const fileFields = [
    { key: "사업자등록증URL", label: "사업자등록증", fileName: "사업자등록증.jpg" },
    { key: "프로필사진URL", label: "프로필사진", fileName: "프로필사진.jpg" },
    { key: "로고URL", label: "로고파일", fileName: "로고.jpg" },
  ];

  for (const { key, label, fileName } of fileFields) {
    const filePath = submissionData[key];
    if (filePath) {
      await uploadFileToSlack({
        channelId,
        filePath,
        fileName,
        title: label,
      });
    }
  }

  return messageResult;
}

/**
 * 상태 변경 로그
 */
export async function logStateChange(params: {
  channelId: string;
  fromState: string;
  toState: string;
  changedBy?: string;
}): Promise<boolean> {
  const { channelId, fromState, toState, changedBy } = params;

  const emoji = getStateEmoji(toState);

  const details: Record<string, string> = {
    "이전 상태": fromState,
    "변경 후": toState,
  };

  if (changedBy) {
    details["변경자"] = changedBy;
  }

  return logProgress({
    channelId,
    stage: "상태 변경",
    status: toState,
    details,
    emoji,
  });
}

/**
 * 상태별 이모지
 */
function getStateEmoji(state: string): string {
  const emojiMap: Record<string, string> = {
    자료제출중: "📝",
    제작진행중: "🎨",
    시안확인: "👀",
    발주요청: "🚀",
    제작완료: "✅",
  };

  return emojiMap[state] || "📌";
}

/**
 * 시안 업로드 로그
 */
export async function logDesignUpload(params: {
  channelId: string;
  itemName: string;
  designUrl: string;
  version?: number;
}): Promise<boolean> {
  const { channelId, itemName, designUrl, version } = params;

  const versionText = version ? `(버전 ${version})` : "";

  // 먼저 메시지 전송
  await postMessage({
    channelId,
    text: `🎨 시안 업로드: ${itemName} ${versionText}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎨 *시안 업로드: ${itemName}* ${versionText}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
          },
        ],
      },
    ],
  });

  // 그 다음 실제 파일 업로드
  return uploadFileToSlack({
    channelId,
    filePath: designUrl,
    fileName: `${itemName}_시안${versionText}.jpg`,
    title: `${itemName} 시안${versionText}`,
  });
}

/**
 * 발주 로그
 */
export async function logOrder(params: {
  channelId: string;
  printItems: string[];
  expectedDate?: Date;
}): Promise<boolean> {
  const { channelId, printItems, expectedDate } = params;

  const details: Record<string, string> = {
    "발주 항목": printItems.join(", "),
  };

  if (expectedDate) {
    details["예상 완료일"] = expectedDate.toLocaleDateString("ko-KR");
  }

  return logProgress({
    channelId,
    stage: "발주 요청 접수",
    status: "관리자 승인 대기 중",
    details,
    emoji: "📋",
  });
}

/**
 * 제작 완료 로그
 */
export async function logProductionComplete(params: {
  channelId: string;
  itemName: string;
  trackingNumber?: string;
}): Promise<boolean> {
  const { channelId, itemName, trackingNumber } = params;

  const details: Record<string, string> = {
    "완료 항목": itemName,
  };

  if (trackingNumber) {
    details["송장번호"] = trackingNumber;
  }

  return logProgress({
    channelId,
    stage: "제작 완료",
    status: `${itemName} 제작 완료`,
    details,
    emoji: "✅",
  });
}

export default {
  createSlackChannel,
  postMessage,
  logProgress,
  pushSubmissionData,
  logStateChange,
  logDesignUpload,
  logOrder,
  logProductionComplete,
};
