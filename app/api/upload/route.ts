import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { fileTypeFromBuffer } from "file-type";

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

// POST: 파일 업로드
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const field = formData.get("field") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 실제 파일 타입 검증 (Magic Number 기반)
    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType) {
      return NextResponse.json(
        { error: "파일 형식을 확인할 수 없습니다" },
        { status: 400 }
      );
    }

    // 허용된 MIME 타입 확인
    const allowedTypes = ALLOWED_MIME_TYPES[field] || ALLOWED_MIME_TYPES.default;

    if (!allowedTypes.includes(detectedType.mime)) {
      return NextResponse.json(
        {
          error: `허용되지 않는 파일 형식입니다. 허용 형식: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 브라우저가 보낸 MIME 타입과 실제 파일 타입 일치 여부 확인
    if (file.type && !file.type.startsWith(detectedType.mime.split("/")[0])) {
      return NextResponse.json(
        { error: "파일 형식이 일치하지 않습니다" },
        { status: 400 }
      );
    }

    // 파일 저장 경로 생성
    const uploadDir = join(process.cwd(), "public", "uploads", userId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일명 생성 (timestamp + 검증된 확장자)
    const timestamp = Date.now();
    const ext = detectedType.ext;
    const filename = `${field}_${timestamp}.${ext}`;
    const filepath = join(uploadDir, filename);

    // 파일 저장
    await writeFile(filepath, buffer);

    // 공개 URL 생성
    const url = `/uploads/${userId}/${filename}`;

    return NextResponse.json({ url, filename, mimeType: detectedType.mime });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
