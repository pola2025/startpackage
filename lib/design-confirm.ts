/**
 * 시안 확정 게이트 공용 규칙 (서버·클라이언트 공유)
 *
 * 확정 경로가 두 곳(시안 대화방 / 진행 상태 페이지)이라 같은 조건을 양쪽에서
 * 검증해야 한다. 화면만 막고 서버를 열어두면 우회 확정이 그대로 남는다.
 */

/** 배송이 필요한 인쇄물 타입 (로고·홈페이지는 배송 단계를 건너뛴다) */
export const SHIPPING_REQUIRED_TYPES = [
  "명함",
  "명찰",
  "대봉투",
  "자문계약서 표지",
  "자문계약서 내지",
];

export function requiresShippingStep(workflowType: string) {
  return SHIPPING_REQUIRED_TYPES.includes(workflowType);
}

/** 최종 동의 항목 — 화면 문구와 서버 검증이 같은 id 를 쓴다 */
export const CONFIRM_AGREEMENTS = [
  {
    id: "표기정보확인",
    label:
      "시안에 들어간 상호, 대표자명, 연락처, 이메일, 주소를 직접 확인했습니다.",
  },
  {
    id: "수정불가",
    label:
      "확정 이후에는 디자인과 배송지를 수정할 수 없다는 점을 확인했습니다.",
  },
  {
    id: "재제작비용부담",
    label:
      "제 확인 착오로 재제작하는 경우 인쇄비와 배송비를 부담한다는 점에 동의합니다.",
  },
];

export const REQUIRED_AGREEMENT_IDS = CONFIRM_AGREEMENTS.map((a) => a.id);

export interface ShippingSnapshot {
  인쇄물받을주소: string;
  받는분이름: string;
  수령연락처: string;
  우편번호: string;
}

export interface DesignConfirmPayload {
  shipping: ShippingSnapshot | null;
  agreements: string[];
}

const PHONE_PATTERN = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

/**
 * 확정 요청 검증. 통과하면 null, 실패하면 사용자에게 보여줄 메시지를 돌려준다.
 *
 * shippingRequired 가 false 면 배송지 검증만 건너뛴다. 지난 기수는 배송지 입력
 * 화면 자체를 거치지 않았기 때문에 확정을 막으면 안 된다.
 */
export function validateConfirmPayload(params: {
  workflowType: string;
  shipping: Partial<ShippingSnapshot> | null | undefined;
  agreements: string[] | undefined;
  /** 배송지 필수 정책 대상 기수인지 (지난 기수는 배송지 검증을 건너뛴다) */
  shippingRequired?: boolean;
}): string | null {
  const { workflowType, shipping, agreements, shippingRequired = true } = params;

  const missingAgreement = REQUIRED_AGREEMENT_IDS.filter(
    (id) => !(agreements || []).includes(id),
  );
  if (missingAgreement.length > 0) {
    return "확정 안내 항목에 모두 동의해야 확정할 수 있습니다.";
  }

  if (!shippingRequired || !requiresShippingStep(workflowType)) return null;

  const 주소 = shipping?.인쇄물받을주소?.trim();
  const 받는분 = shipping?.받는분이름?.trim();
  const 연락처 = shipping?.수령연락처?.trim();

  if (!주소) return "인쇄물을 받으실 주소를 확인해주세요.";
  if (!받는분) return "받는 분 이름을 확인해주세요.";
  if (!연락처) return "수령 연락처를 확인해주세요.";
  if (!PHONE_PATTERN.test(연락처.replace(/\s/g, ""))) {
    return "수령 연락처를 010-0000-0000 형식으로 입력해주세요.";
  }

  return null;
}

/** 확정 스냅샷을 Workflow 갱신용 필드로 변환 */
export function buildConfirmSnapshot(params: {
  workflowType: string;
  shipping: ShippingSnapshot | null | undefined;
  agreements: string[] | undefined;
  shippingRequired?: boolean;
}) {
  const { workflowType, shipping, agreements, shippingRequired = true } = params;
  // 정책 대상이 아니어도 고객이 배송지를 확인해 보냈다면 스냅샷으로 남긴다
  const needsShipping =
    requiresShippingStep(workflowType) &&
    (shippingRequired || !!shipping?.인쇄물받을주소);

  const 주소전문 = needsShipping
    ? [shipping?.우편번호?.trim(), shipping?.인쇄물받을주소?.trim()]
        .filter(Boolean)
        .join(" ")
    : null;

  return {
    확정배송지: 주소전문 || null,
    확정수령인: needsShipping ? shipping?.받는분이름?.trim() || null : null,
    확정수령연락처: needsShipping ? shipping?.수령연락처?.trim() || null : null,
    확정동의항목: (agreements || []) as unknown as object,
    확정일시: new Date(),
  };
}
