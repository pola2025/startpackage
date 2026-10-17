import { beforeEach, describe, expect, it, vi } from "vitest";

const postMessage = vi.fn();
const uploadFileToSlack = vi.fn();
const sendTelegramMessage = vi.fn();
const createSlackChannel = vi.fn();
const pushSubmissionData = vi.fn();
const sendPendingProfileOriginal = vi.fn();

vi.mock("./slackClient", () => ({
  postMessage,
  uploadFileToSlack,
  createSlackChannel,
  pushSubmissionData,
  sendPendingProfileOriginal,
}));
vi.mock("./telegramClient", () => ({ sendTelegramMessage }));

import { notifySubmissionChanges } from "./submissionNotifications";

const person = { slackChannelId: "C123", 이름: "사용자", cohortName: "26기" };
const persist = async () => undefined;

const incomplete = {
  브랜드명: "Brand",
  로고선호스타일: "미니멀",
  로고선호폰트: "고딕",
  로고선호색상: "파랑",
  로고제작요청사항: "짧은 설명",
};
const complete = {
  ...incomplete,
  로고제작요청사항: "가".repeat(20),
  로고예시디자인URL: "https://files.example.com/ref.png",
};

const logoTelegramCalls = () =>
  sendTelegramMessage.mock.calls.filter(([text]) =>
    String(text).startsWith("[startpackage/logo-info]"),
  );

beforeEach(() => {
  vi.clearAllMocks();
  uploadFileToSlack.mockResolvedValue(undefined);
  pushSubmissionData.mockResolvedValue(undefined);
  sendPendingProfileOriginal.mockResolvedValue(true);
  postMessage.mockResolvedValue(undefined);
  sendTelegramMessage.mockResolvedValue(undefined);
  createSlackChannel.mockResolvedValue("C123");
});

describe("로고 정보 접수 알림", () => {
  it("미완료에서 완료로 바뀌는 순간 슬랙·텔레그램에 1회 보낸다", async () => {
    await notifySubmissionChanges("u1", complete, incomplete, person, persist);
    const logoSlack = postMessage.mock.calls.filter(([arg]) =>
      String(arg.text).includes("로고 정보 접수"),
    );
    expect(logoSlack).toHaveLength(1);
    expect(logoSlack[0][0].channelId).toBe("C123");
    expect(logoSlack[0][0].text).toContain("디자이너 작업 시작 가능");
    expect(logoTelegramCalls()).toHaveLength(1);
  });

  it("이전 제출 정보가 없던 첫 저장에서 이미 완료여도 1회 보낸다", async () => {
    await notifySubmissionChanges("u1", complete, undefined, person, persist);
    expect(logoTelegramCalls()).toHaveLength(1);
  });

  it("이미 완료였던 정보를 다시 저장하면 보내지 않는다", async () => {
    await notifySubmissionChanges(
      "u1",
      { ...complete, 브랜드명: "Brand2" },
      complete,
      person,
      persist,
    );
    expect(logoTelegramCalls()).toHaveLength(0);
    expect(
      postMessage.mock.calls.some(([arg]) =>
        String(arg.text).includes("로고 정보 접수"),
      ),
    ).toBe(false);
  });

  it("아직 미완료이면 보내지 않는다", async () => {
    await notifySubmissionChanges(
      "u1",
      { ...incomplete, 로고제작요청사항: "가".repeat(19) },
      incomplete,
      person,
      persist,
    );
    expect(logoTelegramCalls()).toHaveLength(0);
  });

  it("완료에서 미완료로 돌아간 뒤 다시 완료되면 다시 1회 보낸다", async () => {
    await notifySubmissionChanges("u1", incomplete, complete, person, persist);
    expect(logoTelegramCalls()).toHaveLength(0);
    await notifySubmissionChanges("u1", complete, incomplete, person, persist);
    expect(logoTelegramCalls()).toHaveLength(1);
  });

  it("기존 로고 파일을 제출한 순간에도 1회 보낸다", async () => {
    await notifySubmissionChanges(
      "u1",
      {
        브랜드명: "Brand",
        로고제작방식: "기존로고",
        로고URL: "https://files.example.com/logo.png",
      },
      { 브랜드명: "Brand", 로고제작방식: "기존로고" },
      person,
      persist,
    );
    expect(logoTelegramCalls()).toHaveLength(1);
    expect(logoTelegramCalls()[0][0]).toContain("기존 로고 파일 제출");
    expect(
      postMessage.mock.calls.some(([arg]) =>
        String(arg.text).includes("기존 로고 사용"),
      ),
    ).toBe(true);
  });

  it("슬랙 채널이 없어도 텔레그램은 보낸다", async () => {
    await notifySubmissionChanges(
      "u1",
      complete,
      incomplete,
      { 이름: "사용자" },
      persist,
    );
    expect(logoTelegramCalls()).toHaveLength(1);
    expect(
      postMessage.mock.calls.some(([arg]) =>
        String(arg.text).includes("로고 정보 접수"),
      ),
    ).toBe(false);
  });

  it("텔레그램 메시지는 네임태그로 시작하고 설명 자수·참고 로고 수를 알린다", async () => {
    await notifySubmissionChanges("u1", complete, incomplete, person, persist);
    const text = String(logoTelegramCalls()[0][0]);
    expect(text.split("\n")[0]).toBe("[startpackage/logo-info]");
    expect(text).toContain("설명 20자");
    expect(text).toContain("참고 로고 1장");
  });

  it("알림이 실패해도 저장 흐름은 계속된다", async () => {
    sendTelegramMessage.mockRejectedValue(new Error("tg down"));
    postMessage.mockRejectedValue(new Error("slack down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      notifySubmissionChanges("u1", complete, incomplete, person, persist),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
