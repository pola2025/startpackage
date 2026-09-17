import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSlackChannel, postMessage, sendTelegramMessage } = vi.hoisted(() => ({
  createSlackChannel: vi.fn(),
  postMessage: vi.fn(),
  sendTelegramMessage: vi.fn(),
}));

vi.mock("./slackClient", () => ({ createSlackChannel, postMessage }));
vi.mock("./telegramClient", () => ({ sendTelegramMessage }));

import { sendHomepageRequestNotifications } from "./homepageRequest";

const body = {
  홈페이지제작방식: "외부서비스",
  해외결제카드유효기간: "12/30",
  해외결제카드CVC: "123",
  GmailID: "homepage@example.com",
  GmailPW: "secret",
  홈페이지스타일: "https://example.com/style",
  홈페이지컬러컨셉: "#315680",
};

beforeEach(() => {
  vi.clearAllMocks();
  createSlackChannel.mockResolvedValue("C-NEW");
  postMessage.mockResolvedValue(true);
  sendTelegramMessage.mockResolvedValue(true);
});

describe("homepage request notifications", () => {
  it("creates and persists a channel before the first homepage notification", async () => {
    const persistSlackChannel = vi.fn().mockResolvedValue(undefined);

    await sendHomepageRequestNotifications({
      name: "사용자",
      cohortName: "27기",
      brandName: null,
      email: "user@example.com",
      phone: "01012345678",
      slackChannelId: null,
    }, body, persistSlackChannel);

    expect(createSlackChannel).toHaveBeenCalledWith({
      cohortName: "27기",
      userName: "사용자",
      brandName: "homepage",
      userEmail: "user@example.com",
      userPhone: "01012345678",
    });
    expect(persistSlackChannel).toHaveBeenCalledWith("C-NEW");
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ channelId: "C-NEW" }));
    expect(createSlackChannel.mock.invocationCallOrder[0]).toBeLessThan(persistSlackChannel.mock.invocationCallOrder[0]);
    expect(persistSlackChannel.mock.invocationCallOrder[0]).toBeLessThan(postMessage.mock.invocationCallOrder[0]);
  });

  it("reuses the saved channel without creating or persisting another one", async () => {
    const persistSlackChannel = vi.fn().mockResolvedValue(undefined);

    await sendHomepageRequestNotifications({
      name: "사용자",
      cohortName: "27기",
      brandName: "브랜드",
      slackChannelId: "C-EXISTING",
    }, body, persistSlackChannel);

    expect(createSlackChannel).not.toHaveBeenCalled();
    expect(persistSlackChannel).not.toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ channelId: "C-EXISTING" }));
  });

  it("keeps Telegram delivery independent when Slack channel creation fails", async () => {
    createSlackChannel.mockResolvedValue(null);

    await sendHomepageRequestNotifications({
      name: "사용자",
      cohortName: "27기",
      slackChannelId: null,
    }, body, vi.fn());

    expect(postMessage).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });
});
