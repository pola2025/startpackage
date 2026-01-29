/**
 * 사용자 친화적 에러 메시지 유틸리티
 *
 * 45세 IT 비친숙 사용자가 이해할 수 있는 친절한 톤의 에러 메시지
 */

export interface FriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  severity: "info" | "warning" | "error";
}

/**
 * 에러 코드 → 친화적 메시지 매핑
 */
const ERROR_MESSAGES: Record<string, FriendlyError> = {
  // 파일 업로드 관련
  FILE_TOO_LARGE: {
    title: "파일이 너무 커요",
    message: "10MB 이하의 파일만 올릴 수 있어요.",
    suggestion: "파일 크기를 줄이거나 다른 파일을 선택해 주세요.",
    severity: "warning",
  },
  FILE_TYPE_INVALID: {
    title: "지원하지 않는 파일이에요",
    message: "JPG, PNG, PDF 형식의 파일만 올릴 수 있어요.",
    suggestion: "다른 형식의 파일을 선택해 주세요.",
    severity: "warning",
  },
  UPLOAD_FAILED: {
    title: "파일 올리기에 실패했어요",
    message: "일시적인 문제가 발생했어요.",
    suggestion: "잠시 후 다시 시도해 주세요. 계속 안 되면 카카오톡으로 문의해 주세요.",
    severity: "error",
  },
  COMPRESSION_FAILED: {
    title: "이미지 처리 중 문제가 생겼어요",
    message: "이미지를 최적화하는 중 오류가 발생했어요.",
    suggestion: "다른 이미지를 사용하거나 잠시 후 다시 시도해 주세요.",
    severity: "warning",
  },

  // 저장 관련
  SAVE_FAILED: {
    title: "저장에 실패했어요",
    message: "입력하신 내용을 저장하지 못했어요.",
    suggestion: "인터넷 연결을 확인하고 다시 시도해 주세요.",
    severity: "error",
  },
  NETWORK_ERROR: {
    title: "인터넷 연결을 확인해 주세요",
    message: "서버와 연결이 끊어졌어요.",
    suggestion: "Wi-Fi나 데이터를 확인하고 다시 시도해 주세요.",
    severity: "error",
  },

  // 입력값 관련
  REQUIRED_FIELD: {
    title: "필수 항목이에요",
    message: "이 항목은 반드시 입력해 주셔야 해요.",
    severity: "warning",
  },
  INVALID_FORMAT: {
    title: "입력 형식이 맞지 않아요",
    message: "올바른 형식으로 다시 입력해 주세요.",
    severity: "warning",
  },
  INVALID_PHONE: {
    title: "전화번호를 확인해 주세요",
    message: "010으로 시작하는 11자리 번호를 입력해 주세요.",
    suggestion: "예: 01012345678",
    severity: "warning",
  },
  INVALID_EMAIL: {
    title: "이메일 주소를 확인해 주세요",
    message: "올바른 이메일 주소 형식이 아니에요.",
    suggestion: "예: example@email.com",
    severity: "warning",
  },

  // 인증 관련
  SESSION_EXPIRED: {
    title: "로그인이 필요해요",
    message: "로그인 상태가 만료되었어요.",
    suggestion: "다시 로그인해 주세요.",
    severity: "info",
  },
  UNAUTHORIZED: {
    title: "권한이 없어요",
    message: "이 작업을 수행할 권한이 없어요.",
    suggestion: "로그인 상태를 확인해 주세요.",
    severity: "error",
  },

  // 일반
  UNKNOWN: {
    title: "문제가 발생했어요",
    message: "예상치 못한 오류가 발생했어요.",
    suggestion: "잠시 후 다시 시도해 주세요. 계속 안 되면 카카오톡으로 문의해 주세요.",
    severity: "error",
  },
};

/**
 * 에러 코드로 친화적 메시지 가져오기
 */
export function getFriendlyError(errorCode: string): FriendlyError {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN;
}

/**
 * 에러 메시지 문자열을 친화적으로 변환
 */
export function friendlyErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    // 영어 에러 메시지 → 한글 변환
    const lowerError = error.toLowerCase();

    if (lowerError.includes("network") || lowerError.includes("fetch")) {
      return "인터넷 연결을 확인해 주세요.";
    }
    if (lowerError.includes("timeout")) {
      return "응답 시간이 초과되었어요. 다시 시도해 주세요.";
    }
    if (lowerError.includes("unauthorized") || lowerError.includes("401")) {
      return "다시 로그인해 주세요.";
    }
    if (lowerError.includes("forbidden") || lowerError.includes("403")) {
      return "권한이 없어요.";
    }
    if (lowerError.includes("not found") || lowerError.includes("404")) {
      return "요청하신 정보를 찾을 수 없어요.";
    }
    if (lowerError.includes("server") || lowerError.includes("500")) {
      return "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    }

    // 이미 한글이면 그대로 반환
    if (/[가-힣]/.test(error)) {
      return error;
    }

    return "문제가 발생했어요. 다시 시도해 주세요.";
  }

  if (error instanceof Error) {
    return friendlyErrorMessage(error.message);
  }

  return "문제가 발생했어요. 다시 시도해 주세요.";
}

/**
 * 파일 업로드 에러 처리
 */
export function getFileUploadError(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ["image/jpeg", "image/png", "application/pdf"]
): FriendlyError | null {
  // 파일 크기 체크
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return getFriendlyError("FILE_TOO_LARGE");
  }

  // 파일 타입 체크
  if (!allowedTypes.includes(file.type)) {
    return getFriendlyError("FILE_TYPE_INVALID");
  }

  return null;
}

/**
 * API 응답 에러 처리
 */
export function handleApiError(
  response: Response,
  errorData?: { error?: string; message?: string }
): FriendlyError {
  // HTTP 상태 코드별 처리
  switch (response.status) {
    case 400:
      return {
        title: "입력값을 확인해 주세요",
        message: errorData?.message || errorData?.error || "입력하신 정보에 문제가 있어요.",
        severity: "warning",
      };
    case 401:
      return getFriendlyError("SESSION_EXPIRED");
    case 403:
      return getFriendlyError("UNAUTHORIZED");
    case 404:
      return {
        title: "찾을 수 없어요",
        message: "요청하신 정보를 찾을 수 없어요.",
        severity: "warning",
      };
    case 413:
      return getFriendlyError("FILE_TOO_LARGE");
    case 500:
    case 502:
    case 503:
      return {
        title: "서버에 문제가 생겼어요",
        message: "잠시 후 다시 시도해 주세요.",
        suggestion: "계속 문제가 발생하면 카카오톡으로 문의해 주세요.",
        severity: "error",
      };
    default:
      return getFriendlyError("UNKNOWN");
  }
}

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  SAVE: "저장되었어요!",
  UPLOAD: "파일이 올라갔어요!",
  DELETE: "삭제되었어요!",
  SUBMIT: "제출되었어요!",
  UPDATE: "수정되었어요!",
};
