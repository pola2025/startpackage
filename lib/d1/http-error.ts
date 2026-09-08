import { DataServiceRequestError } from "./service-client";

export type DataServiceHttpErrorResponse = {
  body: { error: string };
  status: number;
};

const SAFE_MESSAGES: Record<number, string> = {
  400: "요청 내용을 확인해주세요.",
  401: "로그인이 필요합니다.",
  403: "권한이 없습니다.",
  404: "요청한 항목을 찾을 수 없습니다.",
  409: "다른 변경사항이 저장되었습니다. 새로고침 후 다시 시도해주세요.",
  413: "요청한 파일 또는 데이터의 용량이 제한을 초과했습니다.",
  422: "입력값을 확인해주세요.",
  429: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  503: "서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.",
};

const DEFAULT_MESSAGE = "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

function normalizeStatus(status: number): number {
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 502;
}

export function getDataServiceErrorResponse(error: unknown): DataServiceHttpErrorResponse | null {
  if (!(error instanceof DataServiceRequestError)) return null;

  const status = normalizeStatus(error.status);
  const message = SAFE_MESSAGES[status] ?? (status >= 500 ? DEFAULT_MESSAGE : "요청을 처리할 수 없습니다.");
  return { status, body: { error: message } };
}
