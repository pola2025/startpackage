/**
 * 문의 채팅 첨부 파일 공통 규칙.
 * 업로드 라우트(허용 형식)와 화면(이미지/문서 구분, 파일명 표시)이 같이 쓴다.
 */

/** Vercel 함수 본문 한도가 4.5MB라서 그보다 작게 잡는다. 더 큰 파일은 메일로 받는다. */
export const COMMUNICATION_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const COMMUNICATION_UPLOAD_MAX_LABEL = "4MB";

/** 문서 확장자 → 저장할 Content-Type. 브라우저가 보낸 값은 믿지 않고 이 표로 정한다. */
export const DOCUMENT_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  hwp: "application/x-hwp",
  hwpx: "application/hwp+zip",
  txt: "text/plain; charset=utf-8",
  zip: "application/zip",
  rar: "application/vnd.rar",
};

/** 파일 선택창의 accept 값 */
export const COMMUNICATION_UPLOAD_ACCEPT = `image/*,${Object.keys(
  DOCUMENT_CONTENT_TYPES,
)
  .map((extension) => `.${extension}`)
  .join(",")}`;

const IMAGE_EXTENSIONS = new Set(["webp", "png", "jpg", "jpeg", "gif"]);

export function fileExtension(fileName: string): string {
  const name = fileName.split(/[?#]/)[0];
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function lastSegment(url: string): string {
  const path = url.split(/[?#]/)[0];
  return path.slice(path.lastIndexOf("/") + 1);
}

/** 첨부 URL이 이미지인지 확장자로 판단한다. 기존 이미지 첨부는 모두 webp로 저장돼 있다. */
export function isImageAttachment(url: string): boolean {
  return IMAGE_EXTENSIONS.has(fileExtension(lastSegment(url)));
}

/** 업로드 때 붙인 시각 접두어를 떼고 사람이 읽을 파일명을 돌려준다. */
export function attachmentFileName(url: string): string {
  let name = lastSegment(url);
  try {
    name = decodeURIComponent(name);
  } catch {
    // 인코딩이 깨진 주소는 원문 그대로 보여준다.
  }
  return name.replace(/^\d{10,}-/, "") || "첨부파일";
}

/**
 * 알림(텔레그램·슬랙)에 실을 첨부 목록.
 * 요청 본문에서 온 값이라 https 주소만 남기고, 링크 문법을 깨는 문자는 걸러낸다.
 */
export function attachmentLinks(
  value: unknown,
): { url: string; name: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (url): url is string =>
        typeof url === "string" && /^https:\/\/[^\s"<>|]+$/.test(url),
    )
    .map((url) => ({
      url,
      name: attachmentFileName(url).replace(/[<>|&]/g, "_"),
    }));
}

/** 저장 키에 쓸 파일명. 한글은 살리고 주소·슬랙 링크를 깨는 문자는 밑줄로 바꾼다. */
export function safeAttachmentBaseName(fileName: string): string {
  const withoutPath = fileName.split(/[/\\]/).pop() ?? "";
  const base = withoutPath.replace(/\.[^.]+$/, "");
  const cleaned = base
    .normalize("NFC")
    .replace(/[^0-9A-Za-z가-힣._()-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 60);
  return cleaned || "file";
}
