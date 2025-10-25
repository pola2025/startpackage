import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// POST: 파일 업로드
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
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

    // 프로필 사진 크기 체크
    if (field === "프로필사진URL" && file.type.startsWith("image/")) {
      // TODO: 이미지 크기 검증 (1000px 이하)
    }

    // 파일 저장 경로 생성
    const uploadDir = join(process.cwd(), "public", "uploads", userId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 파일명 생성 (timestamp + 원본 파일명)
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const filename = `${field}_${timestamp}.${ext}`;
    const filepath = join(uploadDir, filename);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // 공개 URL 생성
    const url = `/uploads/${userId}/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
