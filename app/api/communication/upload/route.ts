import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { uploadToR2, generateFileName, validateR2Config } from "@/lib/storage/r2Client";

// Vercel function timeout 설정 (30초)
export const maxDuration = 30;

// 허용되는 이미지 타입
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST: 커뮤니케이션 이미지 업로드
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 제공되지 않았습니다" }, { status: 400 });
    }

    // 이미지 타입 검증
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "이미지 파일만 업로드 가능합니다.\n영상 및 기타 파일은 mkt@polarad.co.kr로 메일 발송 부탁드립니다.",
        },
        { status: 400 }
      );
    }

    // R2 설정 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error("[Upload Communication] R2 설정 오류:", configError.message);
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 }
      );
    }

    // 파일 크기 체크 (10MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2에 업로드 (communication/userId 폴더에 저장)
    const filename = generateFileName("communication", file.name);
    const { url } = await uploadToR2(
      buffer,
      filename,
      file.type,
      `communication/${userId}`
    );

    console.log("[Upload Communication] R2 업로드 완료:", url);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("POST /api/communication/upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
