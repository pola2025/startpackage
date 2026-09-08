export const FILE_UPLOAD_CONTACT = "mkt@polarad.co.kr";

export function formatUploadLimit(maxBytes: number): string {
  const maxMb = maxBytes / (1024 * 1024);
  const display = Number.isInteger(maxMb) ? String(maxMb) : maxMb.toFixed(1);
  return `${display}MB`;
}

export function fileSizeExceededPayload(maxBytes: number) {
  const maxSize = formatUploadLimit(maxBytes);
  return {
    code: "FILE_TOO_LARGE",
    error: `파일 크기는 ${maxSize} 이하여야 합니다. 더 큰 파일은 ${FILE_UPLOAD_CONTACT}로 메일 발송 부탁드립니다.`,
    contactEmail: FILE_UPLOAD_CONTACT,
    maxSizeBytes: maxBytes,
  } as const;
}
