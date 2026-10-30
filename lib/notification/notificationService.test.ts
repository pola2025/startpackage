import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSlackChannel: vi.fn(),
  pushSubmissionData: vi.fn(),
  notifySubmissionComplete: vi.fn(),
  callDataService: vi.fn(),
}));

vi.mock("./slackClient", () => ({
  createSlackChannel: mocks.createSlackChannel,
  pushSubmissionData: mocks.pushSubmissionData,
}));
vi.mock("./telegramClient", () => ({
  notifySubmissionComplete: mocks.notifySubmissionComplete,
}));
vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/d1/runtime", () => ({ isD1RuntimeEnabled: () => true }));
vi.mock("@/lib/d1/service-client", () => ({
  callDataService: mocks.callDataService,
}));

import { handleSubmissionComplete } from "./notificationService";

const params = {
  userId: "u1",
  cohortName: "28기",
  userName: "홍길동",
  brandName: "실제브랜드",
  userEmail: "user@example.com",
  userPhone: "010-6624-6615",
  submissionData: { 브랜드명: "실제브랜드" },
};

describe("handleSubmissionComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSlackChannel.mockResolvedValue("C_NEW");
    mocks.pushSubmissionData.mockResolvedValue(true);
    mocks.notifySubmissionComplete.mockResolvedValue(undefined);
    mocks.callDataService.mockResolvedValue(undefined);
  });

  it("uses the channel the student already has instead of creating a second one", async () => {
    // Meta 설정요청이 "28gi_..._meta" 채널을 먼저 만든 경우: 이름으로 다시 찾으면 못 찾아 채널이 하나 더 생겼다
    await handleSubmissionComplete({ ...params, slackChannelId: "C_META" });

    expect(mocks.createSlackChannel).not.toHaveBeenCalled();
    expect(mocks.pushSubmissionData).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "C_META", userId: "u1" }),
    );
    expect(mocks.callDataService).not.toHaveBeenCalled();
  });

  it("creates and saves a channel when the student has none yet", async () => {
    await handleSubmissionComplete(params);

    expect(mocks.createSlackChannel).toHaveBeenCalledTimes(1);
    expect(mocks.pushSubmissionData).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "C_NEW" }),
    );
    expect(mocks.callDataService).toHaveBeenCalledWith(
      "shared-domain/user-slack-channel-update",
      { userId: "u1", slackChannelId: "C_NEW" },
    );
  });
});
