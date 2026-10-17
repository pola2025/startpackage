import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSlackChannel, postMessage, sendTelegramMessage } = vi.hoisted(
  () => ({
    createSlackChannel: vi.fn(),
    postMessage: vi.fn(),
    sendTelegramMessage: vi.fn(),
  }),
);

vi.mock("./slackClient", () => ({ createSlackChannel, postMessage }));
vi.mock("./telegramClient", () => ({ sendTelegramMessage }));

import {
  buildMetaTokenEmail,
  maskLoginId,
  sendMetaSetupDoneNotifications,
  sendMetaSetupRequestNotifications,
} from "./metaSetup";

const user = {
  name: "홍길동",
  email: "user@example.com",
  phone: "01012345678",
  cohortName: "26기",
  brandName: "브랜드",
  slackChannelId: "C-SAVED",
};

const request = {
  type: "instagram" as const,
  loginId: "my_insta_account",
  password: "Sup3r-Secret-PW!",
  memo: "빠르게 부탁드립니다",
  updated: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  createSlackChannel.mockResolvedValue("C-NEW");
  postMessage.mockResolvedValue(true);
  sendTelegramMessage.mockResolvedValue(true);
});

describe("sendMetaSetupRequestNotifications", () => {
  it("슬랙에는 아이디와 비밀번호 원문이 간다", async () => {
    await sendMetaSetupRequestNotifications(user, request, vi.fn());
    expect(postMessage).toHaveBeenCalledTimes(1);
    const { channelId, text } = postMessage.mock.calls[0][0];
    expect(channelId).toBe("C-SAVED");
    expect(text).toContain("my_insta_account");
    expect(text).toContain("Sup3r-Secret-PW!");
    expect(text).toContain("빠르게 부탁드립니다");
    expect(text).toContain("인스타그램");
    expect(text).toContain("Meta 설정요청 접수");
  });

  it("텔레그램에는 비밀번호가 없고 첫 줄이 네임태그이며 아이디는 앞 5자만 보인다", async () => {
    await sendMetaSetupRequestNotifications(user, request, vi.fn());
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    const message: string = sendTelegramMessage.mock.calls[0][0];
    expect(message.split("\n")[0]).toBe("[startpackage/meta-setup]");
    expect(message).not.toContain("Sup3r-Secret-PW!");
    expect(message).not.toContain("my_insta_account");
    expect(message).toContain("my_in***");
    expect(message).toContain("홍길동");
  });

  it("수정 요청이면 제목이 바뀐다", async () => {
    await sendMetaSetupRequestNotifications(
      user,
      { ...request, updated: true },
      vi.fn(),
    );
    expect(postMessage.mock.calls[0][0].text).toContain("Meta 설정요청 수정");
    expect(sendTelegramMessage.mock.calls[0][0]).toContain(
      "Meta 설정요청 수정",
    );
  });

  it("구글 계정 유형 이름을 쓴다", async () => {
    await sendMetaSetupRequestNotifications(
      user,
      { ...request, type: "google" },
      vi.fn(),
    );
    expect(postMessage.mock.calls[0][0].text).toContain("구글");
  });

  it("채널이 없으면 만들고 저장한 뒤 보낸다", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    await sendMetaSetupRequestNotifications(
      { ...user, slackChannelId: null },
      request,
      persist,
    );
    expect(createSlackChannel).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith("C-NEW");
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channelId: "C-NEW" }),
    );
  });

  it("슬랙이 실패해도 텔레그램은 보낸다", async () => {
    postMessage.mockRejectedValue(new Error("slack down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      sendMetaSetupRequestNotifications(user, request, vi.fn()),
    ).resolves.toBeUndefined();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("텔레그램에 들어가는 이름은 HTML 이스케이프된다", async () => {
    await sendMetaSetupRequestNotifications(
      { ...user, name: "<b>x</b>" },
      request,
      vi.fn(),
    );
    const message: string = sendTelegramMessage.mock.calls[0][0];
    expect(message).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("maskLoginId", () => {
  it("5자 이하는 앞 2자, 그 이상은 앞 5자만 남긴다", () => {
    expect(maskLoginId("abc")).toBe("ab***");
    expect(maskLoginId("abcde")).toBe("ab***");
    expect(maskLoginId("abcdefgh")).toBe("abcde***");
  });
});

describe("buildMetaTokenEmail", () => {
  const tokens = {
    systemUserToken: "EAAB-system-user-token-1234567890",
    threadsToken: "THQW-threads-token-abcdefghij",
  };

  it("본문(html·text)에 토큰 2개가 모두 들어간다", () => {
    const mail = buildMetaTokenEmail({ name: "홍길동", ...tokens });
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain(tokens.systemUserToken);
      expect(body).toContain(tokens.threadsToken);
    }
    expect(mail.subject).toContain("Meta 설정 완료");
    expect(mail.html).toContain("홍길동");
  });

  it("이름이 없으면 대표로 부른다", () => {
    expect(buildMetaTokenEmail({ name: null, ...tokens }).text).toContain(
      "대표님",
    );
  });

  it("html의 토큰은 이스케이프된다", () => {
    const mail = buildMetaTokenEmail({
      name: "<i>x</i>",
      systemUserToken: "<script>alert(1)</script>-padding-padding",
      threadsToken: tokens.threadsToken,
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<i>x</i>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("토큰마다 따로 담긴 상자는 한 번 누르면 전체가 선택되고, 옆의 복사 버튼은 그 토큰을 복사하는 대시보드로 간다", () => {
    const mail = buildMetaTokenEmail({ name: "홍길동", ...tokens });
    for (const token of [tokens.systemUserToken, tokens.threadsToken]) {
      expect(mail.html).toMatch(
        new RegExp(`user-select:all;">${token}</td>`),
      );
    }
    for (const key of ["system", "threads"]) {
      expect(mail.html).toContain(
        `href="https://www.polaai.co.kr/dashboard/meta-setup?copy=${key}"`,
      );
    }
    expect(mail.html.match(/>복사<\/a>/g)).toHaveLength(2);
    expect(mail.html).toContain("max-width:580px");
    expect(mail.html).toContain("background:#0d1b2a");
    expect(mail.html).not.toMatch(/<script|onclick/i);
    expect(mail.text).toContain(
      `① 시스템사용자 토큰\n${tokens.systemUserToken}\n`,
    );
  });
});

describe("sendMetaSetupDoneNotifications", () => {
  it("슬랙·텔레그램 완료 알림에는 토큰이 없다", async () => {
    await sendMetaSetupDoneNotifications(user, { sent: true });
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    const slackText: string = postMessage.mock.calls[0][0].text;
    const telegramText: string = sendTelegramMessage.mock.calls[0][0];
    expect(slackText).toContain("Meta 설정 완료");
    expect(slackText).toContain("user@example.com");
    expect(telegramText.split("\n")[0]).toBe("[startpackage/meta-setup]");
    expect(telegramText).not.toMatch(/EAAB|THQW|token|토큰:/i);
  });

  it("메일 실패 사유를 알린다", async () => {
    await sendMetaSetupDoneNotifications(user, {
      sent: false,
      error: "SMTP 인증 실패",
    });
    expect(postMessage.mock.calls[0][0].text).toContain("발송 실패");
    expect(postMessage.mock.calls[0][0].text).toContain("SMTP 인증 실패");
    expect(sendTelegramMessage.mock.calls[0][0]).toContain("SMTP 인증 실패");
  });

  it("슬랙 채널이 없으면 슬랙은 건너뛰고 텔레그램만 보낸다", async () => {
    await sendMetaSetupDoneNotifications(
      { ...user, slackChannelId: null },
      { sent: true },
    );
    expect(postMessage).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  });
});
