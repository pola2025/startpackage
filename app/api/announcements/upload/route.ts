import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { uploadToR2, generateFileName, validateR2Config } from "@/lib/storage/r2Client";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // 관리자만 이미지 업로드 가능
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 없습니다" },
        { status: 400 }
      );
    }

    // 이미지 타입 검증
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: "이미지 파일만 업로드 가능합니다 (jpg, png, gif, webp)",
      }, { status: 400 });
    }

    // R2 설정 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error("[Upload Announcement] R2 설정 오류:", configError.message);
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 }
      );
    }

    // 파일 크기 체크
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2에 업로드 (announcements 폴더에 저장)
    const filename = generateFileName("announcement", file.name);
    const { url } = await uploadToR2(
      buffer,
      filename,
      file.type,
      "announcements"
    );

    console.log("[Upload Announcement] R2 업로드 완료:", url);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("POST /api/announcements/upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
