"use client";

/**
 * 업로드 전 브라우저 검증 (교육생이 파일을 직접 고른 직후)
 * 서버도 같은 기준(형식은 파일 내용으로, 크기·열림·최소 크기)으로 다시 검사한다.
 * - 이미지(JPG·PNG·WEBP): R2 직접 업로드라 20MB까지
 * - PDF: 일반 업로드(Vercel 함수 본문 4.5MB 한도)라 4MB까지
 */

export const UPLOAD_CONTACT = "mkt@polarad.co.kr";
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const MIN_IMAGE_SIDE_PX = 200;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const extensionOf = (name: string) =>
  (name.split(".").pop() || "").toLowerCase();

export function isImageFile(file: File): boolean {
  return (
    IMAGE_TYPES.includes(file.type) ||
    (!file.type && IMAGE_EXTENSIONS.includes(extensionOf(file.name)))
  );
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || extensionOf(file.name) === "pdf";
}

/** 형식·크기 검사. 문제가 없으면 null, 있으면 교육생에게 보여 줄 문장 */
export function checkUploadFile(
  file: File,
  { allowPdf }: { allowPdf: boolean },
): string | null {
  if (file.size === 0) return "빈 파일입니다. 파일을 다시 골라 주세요.";
  const ext = extensionOf(file.name);
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    ext === "heic" ||
    ext === "heif"
  ) {
    return "아이폰 HEIC 사진은 올릴 수 없습니다. 사진을 JPG로 저장하거나 화면을 캡처해서 올려 주세요.";
  }
  if (isImageFile(file)) {
    if (file.size > IMAGE_MAX_BYTES) {
      return `이미지는 20MB 이하만 올릴 수 있습니다. 더 큰 파일은 ${UPLOAD_CONTACT}로 보내 주세요.`;
    }
    return null;
  }
  if (allowPdf && isPdfFile(file)) {
    if (file.size > DOCUMENT_MAX_BYTES) {
      return `PDF는 4MB 이하만 올릴 수 있습니다. 더 큰 파일은 ${UPLOAD_CONTACT}로 보내 주세요.`;
    }
    return null;
  }
  return allowPdf
    ? "JPG, PNG, WEBP 이미지나 PDF 파일만 올릴 수 있습니다."
    : "JPG, PNG, WEBP 이미지만 올릴 수 있습니다.";
}

/** 이미지가 실제로 열리고 알아볼 수 있는 크기인지 확인. 브라우저가 지원하지 않으면 서버 검사에 맡긴다. */
export async function checkImageReadable(file: File): Promise<string | null> {
  if (!isImageFile(file) || typeof createImageBitmap !== "function")
    return null;
  try {
    const bitmap = await createImageBitmap(file);
    const shortSide = Math.min(bitmap.width, bitmap.height);
    bitmap.close?.();
    if (shortSide < MIN_IMAGE_SIDE_PX) {
      return `이미지가 너무 작습니다. 가로·세로 ${MIN_IMAGE_SIDE_PX}px 이상인 이미지를 올려 주세요.`;
    }
    return null;
  } catch {
    return "이미지 파일을 열 수 없습니다. 다른 파일로 다시 올려 주세요.";
  }
}
