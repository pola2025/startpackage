// 로그인 뒤 돌아갈 화면 주소 (서버·클라이언트 공용, 서버 전용 import 금지)
// 알림톡 버튼처럼 대시보드 안쪽 주소로 바로 들어온 수강생을 로그인 뒤 그 화면으로 보낸다.

export const RETURN_PATH_PARAM = "next";
export const DEFAULT_RETURN_PATH = "/dashboard";

const MAX_RETURN_PATH_LENGTH = 512;
const PARSE_BASE = "https://return-path.invalid";

// 수강생 대시보드 안쪽 주소만 허용한다. 다른 사이트나 대시보드 밖으로 보내는 값은 기본 화면으로 바꾼다.
export function safeReturnPath(value: string | null | undefined) {
  if (!value || value.length > MAX_RETURN_PATH_LENGTH)
    return DEFAULT_RETURN_PATH;
  if (!value.startsWith("/") || /[\\\u0000-\u001f]/.test(value))
    return DEFAULT_RETURN_PATH;

  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return DEFAULT_RETURN_PATH;
  }
  if (url.origin !== PARSE_BASE) return DEFAULT_RETURN_PATH;
  if (
    url.pathname !== DEFAULT_RETURN_PATH &&
    !url.pathname.startsWith(`${DEFAULT_RETURN_PATH}/`)
  ) {
    return DEFAULT_RETURN_PATH;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

// 로그인하지 않은 방문자를 로그인 화면으로 보낼 주소. 대시보드 홈이면 주소에 아무것도 붙이지 않는다.
export function loginPathFor(pathname: string, search = "") {
  const target = safeReturnPath(`${pathname}${search}`);
  if (target === DEFAULT_RETURN_PATH) return "/";
  return `/?${RETURN_PATH_PARAM}=${encodeURIComponent(target)}`;
}
