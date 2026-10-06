import { describe, expect, it, vi } from "vitest";

const postMessage = vi.fn().mockResolvedValue(undefined);
const uploadFileToSlack = vi.fn().mockResolvedValue(undefined);
const sendTelegramMessage = vi.fn().mockResolvedValue(undefined);
const createSlackChannel = vi.fn().mockResolvedValue("C123");
const pushSubmissionData = vi.fn().mockResolvedValue(undefined);
const sendPendingProfileOriginal = vi.fn().mockResolvedValue(true);

vi.mock("./slackClient", () => ({ postMessage, uploadFileToSlack, createSlackChannel, pushSubmissionData, sendPendingProfileOriginal }));
vi.mock("./telegramClient", () => ({ sendTelegramMessage }));

describe("submission notification parity", () => {
  it("emits shared homepage, credential, file, and print style notifications", async () => {
    const { notifySubmissionChanges } = await import("./submissionNotifications");
    await notifySubmissionChanges("u1", {
      브랜드명: "Brand", 업종: "서비스", 주소: "서울", 홈페이지스타일: "https://example.com",
      홈페이지컬러컨셉: "블루", GmailID: "brand@example.com", GmailPW: "secret",
      사업자등록증URL: "https://files.example.com/business.pdf", 명함시안: "앞면", 계약서시안: "표지",
    }, {}, { 이름: "사용자", email: "user@example.com", cohortName: "Cohort" }, async () => undefined);
    expect(createSlackChannel).toHaveBeenCalledTimes(1);
    expect(pushSubmissionData).toHaveBeenCalledTimes(1);
    expect(pushSubmissionData).toHaveBeenCalledWith(expect.objectContaining({ channelId: "C123", userId: "u1" }));
    expect(postMessage).toHaveBeenCalledTimes(4);
    expect(uploadFileToSlack).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });

  it("does not resend unchanged homepage or Gmail details on unrelated saves", async () => {
    vi.clearAllMocks();
    const { notifySubmissionChanges } = await import("./submissionNotifications");
    await notifySubmissionChanges("u1", { 홈페이지스타일: "https://example.com", GmailID: "brand@example.com", 대표번호: "010-1234-5678" }, { 홈페이지스타일: "https://example.com", GmailID: "brand@example.com", 대표번호: "010-0000-0000" }, { slackChannelId: "C123" }, async () => undefined, ["대표번호"]);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(uploadFileToSlack).not.toHaveBeenCalled();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("sends the waiting profile original instead of the display webp when the photo changes", async () => {
    vi.clearAllMocks();
    const { notifySubmissionChanges } = await import("./submissionNotifications");
    await notifySubmissionChanges("u1", { 프로필사진URL: "https://files.example.com/u1/new.webp" }, { 프로필사진URL: "https://files.example.com/u1/old.webp" }, { slackChannelId: "C123", 이름: "사용자" }, async () => undefined, ["프로필사진URL"]);
    expect(sendPendingProfileOriginal).toHaveBeenCalledWith({ userId: "u1", channelId: "C123", userName: "사용자" });
    expect(uploadFileToSlack).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });
});
