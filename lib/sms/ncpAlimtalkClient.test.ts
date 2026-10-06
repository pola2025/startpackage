import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAlimtalkResult,
  isAlimtalkConfigured,
  requestAlimtalk,
} from "./ncpAlimtalkClient";
import {
  designReadyTemplate,
  marketingExtensionApprovedTemplate,
  marketingExtensionRejectedTemplate,
  orderCompleteTemplate,
  shippingStartTemplate,
} from "./alimtalkTemplates";

const fetchMock = vi.fn();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

describe("ncpAlimtalkClient", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NCP_KAKAO_SERVICE_ID = "ncp:kkobizmsg:kr:1:test";
    process.env.NCP_KAKAO_CHANNEL_ID = "@test";
    process.env.NCP_ACCESS_KEY = "access";
    process.env.NCP_SECRET_KEY = "secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is off unless both the service and the channel are configured", () => {
    expect(isAlimtalkConfigured()).toBe(true);
    delete process.env.NCP_KAKAO_CHANNEL_ID;
    expect(isAlimtalkConfigured()).toBe(false);
  });

  it("requests the template with SMS failover turned on", async () => {
    fetchMock.mockResolvedValue(
      json(202, {
        messages: [{ messageId: "m-1", requestStatusCode: "A000" }],
      }),
    );

    const result = await requestAlimtalk({
      to: "010-1234-5678",
      message: designReadyTemplate({ name: "홍길동", items: ["명함"] }),
      failover: {
        content:
          "[스타트패키지]\n\n디자인 시안이 업로드되었습니다.\n확인 부탁드립니다.",
        from: "01066246615",
      },
    });

    expect(result).toEqual({ accepted: true, messageId: "m-1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://sens.apigw.ntruss.com/alimtalk/v2/services/ncp%3Akkobizmsg%3Akr%3A1%3Atest/messages",
    );
    const body = JSON.parse(init.body);
    expect(body.plusFriendId).toBe("@test");
    expect(body.templateCode).toBe("spDesignReady01");
    expect(body.messages[0]).toMatchObject({
      to: "01012345678",
      useSmsFailover: true,
      failoverConfig: {
        type: "LMS",
        from: "01066246615",
        content: expect.stringContaining("디자인 시안이 업로드되었습니다."),
      },
    });
    expect(body.messages[0].buttons).toHaveLength(3);
  });

  it("reports a rejected request so the caller can send the SMS itself", async () => {
    fetchMock.mockResolvedValue(
      json(400, { status: 400, errors: ["Invalid templateCode"] }),
    );

    const result = await requestAlimtalk({
      to: "01012345678",
      message: designReadyTemplate({ name: "홍길동", items: ["명함"] }),
      failover: { content: "문자" },
    });

    expect(result).toEqual({ accepted: false, reason: "Invalid templateCode" });
  });

  it("reads the delivery result, including the SMS sent in its place", async () => {
    fetchMock.mockResolvedValueOnce(
      json(200, { messageStatusName: "success" }),
    );
    expect(await getAlimtalkResult("m-1")).toEqual({ state: "delivered" });

    fetchMock.mockResolvedValueOnce(
      json(200, {
        messageStatusName: "fail",
        messageStatusDesc: "템플릿을 찾을 수 없음",
        failover: {
          requestStatusName: "success",
          messageStatusName: "success",
        },
      }),
    );
    expect(await getAlimtalkResult("m-1")).toEqual({
      state: "failover",
      description: "템플릿을 찾을 수 없음",
    });

    fetchMock.mockResolvedValueOnce(
      json(200, { messageStatusName: "fail", messageStatusDesc: "수신 차단" }),
    );
    expect(await getAlimtalkResult("m-1")).toEqual({
      state: "failed",
      description: "수신 차단",
    });

    fetchMock.mockResolvedValueOnce(
      json(200, { requestStatusName: "success" }),
    );
    expect(await getAlimtalkResult("m-1")).toEqual({ state: "pending" });

    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await getAlimtalkResult("m-1")).toEqual({ state: "pending" });
  });
});

// SENS 콘솔에 등록한 문구와 같아야 알림톡으로 나간다. 문구를 바꾸면 이 테스트와 콘솔 템플릿을 함께 고친다.
describe("alimtalkTemplates", () => {
  it("matches the registered design-ready template", () => {
    const message = designReadyTemplate({
      name: "홍길동",
      items: ["명함", "명찰"],
    });
    expect(message.content).toBe(
      "[스타트패키지]\n\n홍길동님, 명함, 명찰 디자인 시안이 업로드되었습니다.\n\n확인 부탁드립니다.\n\n카카오톡으로 문의하실 때는 기수와 성함을 먼저 남겨주세요.",
    );
    expect(message.buttons).toEqual([
      {
        type: "WL",
        name: "시안 확인하기",
        linkMobile: "https://www.polaai.co.kr/dashboard/design-threads",
        linkPc: "https://www.polaai.co.kr/dashboard/design-threads",
      },
      {
        type: "WL",
        name: "디자인 문의하기",
        linkMobile:
          "https://www.polaai.co.kr/dashboard/communication?new=design",
        linkPc: "https://www.polaai.co.kr/dashboard/communication?new=design",
      },
      {
        type: "WL",
        name: "카카오톡 문의",
        linkMobile: "https://pf.kakao.com/_CTaiX/chat",
        linkPc: "https://pf.kakao.com/_CTaiX/chat",
      },
    ]);
  });

  it("matches the registered order-complete template", () => {
    const message = orderCompleteTemplate({
      items: ["명함"],
      address: "04524 서울시 중구 세종대로 1 (홍길동)",
    });
    expect(message.templateCode).toBe("spOrderComplete01");
    expect(message.content).toBe(
      "[스타트패키지] 발주가 완료되었습니다.\n\n제작물: 명함\n받으실 곳: 04524 서울시 중구 세종대로 1 (홍길동)\n\n발주가 진행되어 배송지는 변경할 수 없습니다.\n\n제작이 진행됩니다. 제작 완료 시 다시 안내드리겠습니다.",
    );
    expect(message.buttons).toEqual([
      {
        type: "WL",
        name: "진행 상황 보기",
        linkMobile: "https://www.polaai.co.kr/dashboard",
        linkPc: "https://www.polaai.co.kr/dashboard",
      },
    ]);
  });

  it("matches the registered shipping-start template", () => {
    const message = shippingStartTemplate({
      items: ["명함", "명찰"],
      courier: "CJ대한통운",
      tracking: "123456789012",
    });
    expect(message.templateCode).toBe("spShippingStart01");
    expect(message.content).toBe(
      "[스타트패키지] 배송이 시작되었습니다.\n\n제작물: 명함, 명찰\n택배: CJ대한통운\n운송장: 123456789012\n\n배송 조회를 통해 확인하세요.",
    );
    expect(message.buttons).toEqual([{ type: "DS", name: "배송 조회" }]);
  });

  it("matches the registered marketing extension templates", () => {
    const approved = marketingExtensionApprovedTemplate({
      endDate: "2026. 12. 31.",
      amount: "99만원",
    });
    expect(approved.templateCode).toBe("spMktExtApproved01");
    expect(approved.content).toBe(
      "[스타트패키지] 마케팅 지원 연장이 승인되었습니다.\n\n새로운 종료일: 2026. 12. 31.\n\n결제 정보: 우리은행 1005-302-954803 폴라애드(이재호) / 99만원(VAT포함)",
    );
    expect(approved.buttons).toEqual([
      {
        type: "WL",
        name: "내용 확인하기",
        linkMobile: "https://www.polaai.co.kr/dashboard",
        linkPc: "https://www.polaai.co.kr/dashboard",
      },
    ]);

    const rejected = marketingExtensionRejectedTemplate({
      reason: "신청 기간이 지났습니다",
    });
    expect(rejected.templateCode).toBe("spMktExtRejected01");
    expect(rejected.content).toBe(
      "[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다.\n\n사유: 신청 기간이 지났습니다",
    );
    expect(rejected.buttons).toEqual([
      {
        type: "WL",
        name: "문의하기",
        linkMobile: "https://www.polaai.co.kr/dashboard/communication",
        linkPc: "https://www.polaai.co.kr/dashboard/communication",
      },
    ]);
  });
});
