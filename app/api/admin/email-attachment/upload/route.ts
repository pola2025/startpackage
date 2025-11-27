import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { uploadToR2, generateFileName, validateR2Config } from "@/lib/storage/r2Client";

// Vercel function 설정
export const maxDuration = 30;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 이메일 첨부 허용 파일 타입
const ALLOWED_FILE_TYPES = [
  // 이미지
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // 문서
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // 텍스트
  "text/plain",
  "text/csv",
  // 압축
  "application/zip",
  "application/x-zip-compressed",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 파일 확장자별 Content-Type 매핑
const EXTENSION_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

/**
 * POST /api/admin/email-attachment/upload
 * 이메일 첨부파일 업로드 (관리자 전용)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    const adminRole = (session?.user as any)?.role;

    // 관리자 권한 확인
    if (!session || !["super", "designer", "operator"].includes(adminRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = file.type || EXTENSION_TO_TYPE[fileExtension] || "";

    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `지원하지 않는 파일 형식입니다.\n지원: 이미지(jpg, png, gif, webp), 문서(pdf, doc, docx, xls, xlsx, ppt, pptx), 텍스트(txt, csv), 압축(zip)`,
        },
        { status: 400 }
      );
    }

    // R2 설정 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error("[Email Attachment] R2 설정 오류:", configError.message);
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 }
      );
    }

    // 파일 크기 체크
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2에 업로드
    const filename = generateFileName("email-attachment", file.name);
    const { url } = await uploadToR2(
      buffer,
      filename,
      mimeType,
      `email-attachments/${adminId}`
    );

    console.log("[Email Attachment] R2 업로드 완료:", url);

    return NextResponse.json({
      success: true,
      url,
      filename: file.name,
      size: file.size,
      type: mimeType,
    });
  } catch (error) {
    console.error("POST /api/admin/email-attachment/upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
