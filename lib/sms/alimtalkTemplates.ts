/**
 * 검수받은 알림톡 템플릿(2026-10-06 등록, 채널 @polarad).
 * 본문·버튼 이름·링크를 바꾸려면 SENS 콘솔에서 템플릿을 먼저 수정해 다시 검수받아야 한다.
 * 여기 문구가 템플릿과 한 글자라도 다르면 알림톡은 실패하고 문자로 대체 발송된다.
 */

import type { AlimtalkMessage } from "./ncpAlimtalkClient";

const SITE = "https://www.polaai.co.kr";
const KAKAO_CHAT = "https://pf.kakao.com/_CTaiX/chat";

function link(name: string, url: string) {
  return { type: "WL" as const, name, linkMobile: url, linkPc: url };
}

/** 시안 업로드 안내. 수강생이 시안을 확정하면 발주 요청으로 접수된다. */
export function designReadyTemplate(input: {
  name: string;
  items: string[];
}): AlimtalkMessage {
  return {
    templateCode: "spDesignReady01",
    content: `[스타트패키지]\n\n${input.name}님, ${input.items.join(", ")} 디자인 시안이 업로드되었습니다.\n\n확인 부탁드립니다.\n\n카카오톡으로 문의하실 때는 기수와 성함을 먼저 남겨주세요.`,
    buttons: [
      link("시안 확인하기", `${SITE}/dashboard/design-threads`),
      link("디자인 문의하기", `${SITE}/dashboard/communication?new=design`),
      link("카카오톡 문의", KAKAO_CHAT),
    ],
  };
}

/** 발주 완료 안내. address 는 "배송지 (수령인)" 형태다. */
export function orderCompleteTemplate(input: {
  items: string[];
  address: string;
}): AlimtalkMessage {
  return {
    templateCode: "spOrderComplete01",
    content: `[스타트패키지] 발주가 완료되었습니다.\n\n제작물: ${input.items.join(", ")}\n받으실 곳: ${input.address}\n\n발주가 진행되어 배송지는 변경할 수 없습니다.\n\n제작이 진행됩니다. 제작 완료 시 다시 안내드리겠습니다.`,
    buttons: [link("진행 상황 보기", `${SITE}/dashboard`)],
  };
}

/** 배송 시작 안내. 배송조회 버튼은 본문의 택배사와 운송장 번호를 읽어 조회 화면을 연다. */
export function shippingStartTemplate(input: {
  items: string[];
  courier: string;
  tracking: string;
}): AlimtalkMessage {
  return {
    templateCode: "spShippingStart01",
    content: `[스타트패키지] 배송이 시작되었습니다.\n\n제작물: ${input.items.join(", ")}\n택배: ${input.courier}\n운송장: ${input.tracking}\n\n배송 조회를 통해 확인하세요.`,
    buttons: [{ type: "DS", name: "배송 조회" }],
  };
}

/** 마케팅 지원 연장 승인 안내. 결제 계좌는 템플릿에 고정돼 있어 바뀌면 다시 검수받아야 한다. */
export function marketingExtensionApprovedTemplate(input: {
  endDate: string;
  amount: string;
}): AlimtalkMessage {
  return {
    templateCode: "spMktExtApproved01",
    content: `[스타트패키지] 마케팅 지원 연장이 승인되었습니다.\n\n새로운 종료일: ${input.endDate}\n\n결제 정보: 우리은행 1005-302-954803 폴라애드(이재호) / ${input.amount}(VAT포함)`,
    buttons: [link("내용 확인하기", `${SITE}/dashboard`)],
  };
}

/**
 * 2주차 가입·자료 제출 안내. 아직 가입하지 않은 명단 대상자에게도 가므로 이름 변수를 두지 않는다.
 * 알림톡이 실패하면 같은 문구가 문자로 나간다.
 */
export const SIGNUP_REMIND_TEXT =
  "비즈액터스쿨 스타트패키지 운영주관사\n폴라애드에서 안내드립니다.\n\n스타트패키지 가입 및 자료제출 바랍니다.\n인쇄물 제작 및 홈페이지 제작은 가입 후\n자료제출이 되어야만 진행이 가능합니다.";

export function signupRemindTemplate(): AlimtalkMessage {
  return {
    templateCode: "spSignupRemind01",
    content: SIGNUP_REMIND_TEXT,
    buttons: [link("스타트패키지 바로가기", SITE)],
  };
}

/** 마케팅 지원 연장 거부 안내 */
export function marketingExtensionRejectedTemplate(input: {
  reason: string;
}): AlimtalkMessage {
  return {
    templateCode: "spMktExtRejected01",
    content: `[스타트패키지] 마케팅 지원 연장 신청이 거부되었습니다.\n\n사유: ${input.reason}`,
    buttons: [link("문의하기", `${SITE}/dashboard/communication`)],
  };
}
