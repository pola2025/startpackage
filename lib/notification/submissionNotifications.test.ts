import { describe, expect, it, vi } from "vitest";

const postMessage = vi.fn().mockResolvedValue(undefined);
const uploadFileToSlack = vi.fn().mockResolvedValue(undefined);
const sendTelegramMessage = vi.fn().mockResolvedValue(undefined);
const createSlackChannel = vi.fn().mockResolvedValue("C123");
const pushSubmissionData = vi.fn().mockResolvedValue(undefined);

vi.mock("./slackClient", () => ({ postMessage, uploadFileToSlack, createSlackChannel, pushSubmissionData }));
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
});
