"use client";

/**
 * 프로필 사진 클라이언트 업로드 (presigned 직접 업로드)
 * - presign URL 발급 → R2 직접 PUT(원본, Vercel 우회) → finalize(슬랙 원본 + webp R2)
 * - 네트워크 끊김(isNetwork)을 구분해 모바일에서 PC 업로드 안내에 활용
 */

export const PROFILE_MAX_SIZE = 20 * 1024 * 1024; // 20MB

export class ProfileUploadError extends Error {
  isNetwork: boolean;
  constructor(message: string, isNetwork = false) {
    super(message);
    this.name = "ProfileUploadError";
    this.isNetwork = isNetwork;
  }
}

/** 모바일 기기 여부 (네트워크 안내 분기용) */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
}

/** 모바일 네트워크 끊김 안내 메시지 (공용) */
export const MOBILE_NETWORK_GUIDE =
  "모바일 네트워크가 불안정합니다. PC에서 업로드 부탁드립니다.";

/**
 * 업로드 에러를 사용자 메시지로 변환
 * - 네트워크 끊김 + 모바일이면 PC 업로드 안내
 */
export function toUploadMessage(err: unknown): string {
  const e = err as ProfileUploadError | undefined;
  if (e?.isNetwork && isMobileDevice()) return MOBILE_NETWORK_GUIDE;
  return e?.message || "파일 업로드에 실패했습니다.";
}

/** R2로 원본 직접 PUT (진행률/타임아웃/끊김 감지) */
function putToR2(
  url: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 180000; // 3분 (대용량 + 느린 회선 대비)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ProfileUploadError("업로드에 실패했습니다.", false));
    };
    xhr.onerror = () =>
      reject(
        new ProfileUploadError(
          "네트워크 오류로 업로드가 중단되었습니다.",
          true,
        ),
      );
    xhr.ontimeout = () =>
      reject(new ProfileUploadError("업로드 시간이 초과되었습니다.", true));
    xhr.onabort = () =>
      reject(new ProfileUploadError("업로드가 중단되었습니다.", true));
    xhr.send(file);
  });
}

/**
 * 프로필 사진 업로드
 * @returns 표시용 webp URL (또는 SLACK_ONLY 마커)
 * @throws ProfileUploadError
 */
export async function uploadProfilePhoto(
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  if (file.size > PROFILE_MAX_SIZE) {
    throw new ProfileUploadError("파일 크기는 20MB 이하여야 합니다.", false);
  }
  if (!file.type.startsWith("image/")) {
    throw new ProfileUploadError("이미지 파일만 업로드할 수 있습니다.", false);
  }

  // 1) presigned URL 발급
  let presign: { uploadUrl: string; tempKey: string };
  try {
    const res = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field: "프로필사진URL",
        filename: file.name,
        contentType: file.type,
        size: file.size,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new ProfileUploadError(
        e.error || "업로드 준비에 실패했습니다.",
        false,
      );
    }
    presign = await res.json();
  } catch (err) {
    if (err instanceof ProfileUploadError) throw err;
    throw new ProfileUploadError(
      "업로드 준비 중 네트워크 오류가 발생했습니다.",
      true,
    );
  }

  // 2) R2 직접 PUT (원본)
  await putToR2(presign.uploadUrl, file, onProgress);

  // 3) finalize (슬랙 원본 전송 + webp 압축 R2 저장)
  try {
    const res = await fetch("/api/upload/profile-finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempKey: presign.tempKey, filename: file.name }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new ProfileUploadError(
        e.error || "프로필 사진 처리에 실패했습니다.",
        false,
      );
    }
    const data = await res.json();
    return data.url as string;
  } catch (err) {
    if (err instanceof ProfileUploadError) throw err;
    throw new ProfileUploadError("처리 중 네트워크 오류가 발생했습니다.", true);
  }
}
