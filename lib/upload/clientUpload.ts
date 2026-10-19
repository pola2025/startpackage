import imageCompression from "browser-image-compression";

/**
 * Vercel 함수를 거치는 업로드(`/api/upload`, `/api/communication/upload` 등) 공통 규칙.
 * Vercel 은 요청 본문이 4.5MB 를 넘으면 함수에 닿기 전에 413(FUNCTION_PAYLOAD_TOO_LARGE)으로 막는다.
 * presign 으로 R2 에 바로 올리는 경로(프로필·사업자등록증·로고 이미지)는 이 한도와 무관하다.
 */
export const VERCEL_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
export const VERCEL_UPLOAD_MAX_LABEL = "4MB";
export const UPLOAD_TOO_LARGE_MESSAGE = `파일이 ${VERCEL_UPLOAD_MAX_LABEL}보다 커서 올릴 수 없습니다. 크기를 줄여서 다시 올리거나 mkt@polarad.co.kr로 보내 주세요.`;

const SHRINKABLE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** 한도를 넘는 사진만 브라우저에서 줄인다. 문서·GIF 나 이미 작은 파일은 그대로 돌려준다. */
export async function shrinkImageForUpload(file: File): Promise<File> {
  if (
    file.size <= VERCEL_UPLOAD_MAX_BYTES ||
    !SHRINKABLE_TYPES.includes(file.type)
  )
    return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 3.5,
      maxWidthOrHeight: 4000,
      useWebWorker: true,
      fileType: file.type,
    });
    return new File([compressed], file.name, {
      type: compressed.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error("[업로드] 이미지 줄이기 실패:", error);
    return file;
  }
}

/** 413 은 JSON 이 아니므로 먼저 걸러 내고, 나머지는 서버가 보낸 error 문구를 쓴다. */
export async function uploadErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  if (response.status === 413) return UPLOAD_TOO_LARGE_MESSAGE;
  const data = (await response.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return typeof data?.error === "string" && data.error ? data.error : fallback;
}
