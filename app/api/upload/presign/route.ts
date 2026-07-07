import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getSignedUploadUrl, validateR2Config } from "@/lib/storage/r2Client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 프로필 원본 직접 업로드 상한 (Vercel 함수를 거치지 않으므로 20MB 허용)
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST: 프로필 사진 R2 직접 업로드용 presigned PUT URL 발급
 * - 클라이언트가 이 URL로 원본을 R2에 직접 PUT (Vercel body 4.5MB 제한 우회)
 * - 이후 /api/upload/profile-finalize 에서 슬랙 전송 + webp 압축 처리
 */
export async function POST(request: Request) {
  try {
    validateR2Config();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
    }

    const { field, filename, contentType, size } = body || {};

    // 프로필 전용 엔드포인트
    if (field !== "프로필사진URL") {
      return NextResponse.json(
        { error: "지원하지 않는 필드입니다" },
        { status: 400 },
      );
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다 (JPG/PNG/WEBP)" },
        { status: 400 },
      );
    }
    if (typeof size !== "number" || size <= 0 || size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 20MB 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 확장자 sanitize + userId 네임스페이스 임시 키 (IDOR 방지)
    const ext =
      (
        String(filename || "")
          .split(".")
          .pop() || "jpg"
      )
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5) || "jpg";
    const tempKey = `${userId}/_tmp/profile_${Date.now()}.${ext}`;

    const uploadUrl = await getSignedUploadUrl(tempKey, contentType, 300);

    return NextResponse.json({ uploadUrl, tempKey });
  } catch (error: any) {
    console.error("[Presign API] 오류:", error);
    return NextResponse.json(
      { error: "업로드 준비에 실패했습니다", details: error?.message },
      { status: 500 },
    );
  }
}
