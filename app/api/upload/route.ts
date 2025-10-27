import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { uploadToR2, generateFileName, validateR2Config } from "@/lib/storage/r2Client";

// Vercel function timeout 설정 (30초)
export const maxDuration = 30;

// 필드별 허용 MIME 타입 정의
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  프로필사진URL: ["image/jpeg", "image/png", "image/webp"],
  사업자등록증URL: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  통장사본URL: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  default: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
};

// POST: 파일 업로드 (Cloudflare R2)
export async function POST(request: Request) {
  try {
    console.log("[Upload API] 요청 시작");

    // R2 환경 변수 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error("[Upload API] R2 설정 오류:", configError.message);
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user) {
      console.log("[Upload API] 인증 실패: 세션 없음");
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      console.log("[Upload API] User ID 없음");
      return NextResponse.json({ error: "사용자 정보를 찾을 수 없습니다" }, { status: 400 });
    }

    console.log("[Upload API] 사용자:", userId);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const field = formData.get("field") as string;

    console.log("[Upload API] 필드:", field, "파일명:", file?.name, "파일 크기:", file?.size);

    if (!file) {
      console.log("[Upload API] 파일 없음");
      return NextResponse.json({ error: "파일이 제공되지 않았습니다" }, { status: 400 });
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log("[Upload API] 파일 크기 초과:", file.size);
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    console.log("[Upload API] 파일 버퍼 읽기 시작");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log("[Upload API] 버퍼 크기:", buffer.length);

    // 실제 파일 타입 검증 (Magic Number 기반)
    console.log("[Upload API] 파일 타입 검증 시작");
    let detectedType;
    try {
      detectedType = await fileTypeFromBuffer(buffer);
      console.log("[Upload API] 감지된 타입:", detectedType);
    } catch (typeError) {
      console.error("[Upload API] 파일 타입 감지 오류:", typeError);
      // 파일 타입 감지에 실패해도 브라우저가 보낸 MIME 타입으로 처리 시도
      if (file.type) {
        console.log("[Upload API] 브라우저 MIME 타입 사용:", file.type);
        detectedType = null;
      } else {
        return NextResponse.json(
          { error: "파일 형식을 확인할 수 없습니다" },
          { status: 400 }
        );
      }
    }

    // 허용된 MIME 타입 확인
    const allowedTypes = ALLOWED_MIME_TYPES[field] || ALLOWED_MIME_TYPES.default;
    console.log("[Upload API] 허용 타입:", allowedTypes);

    // MIME 타입 검증 (감지된 타입이 있으면 사용, 없으면 브라우저 타입 사용)
    const actualMimeType = detectedType?.mime || file.type;
    console.log("[Upload API] 실제 MIME 타입:", actualMimeType);

    if (!allowedTypes.includes(actualMimeType)) {
      console.log("[Upload API] 허용되지 않은 파일 형식:", actualMimeType);
      return NextResponse.json(
        {
          error: `허용되지 않는 파일 형식입니다. 허용 형식: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // R2에 파일 업로드
    console.log("[Upload API] R2 업로드 시작");
    const filename = generateFileName(field, file.name);

    const { url, key } = await uploadToR2(
      buffer,
      filename,
      actualMimeType,
      userId
    );

    console.log("[Upload API] R2 업로드 완료");
    console.log("[Upload API] 공개 URL:", url);
    console.log("[Upload API] R2 Key:", key);

    return NextResponse.json({
      url,
      filename,
      mimeType: actualMimeType,
      key
    });
  } catch (error: any) {
    console.error("[Upload API] 치명적 오류:", error);
    console.error("[Upload API] 오류 스택:", error?.stack);
    return NextResponse.json(
      {
        error: "파일 업로드에 실패했습니다",
        details: error?.message || "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}
