import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  uploadToR2,
  generateFileName,
  validateR2Config,
} from "@/lib/storage/r2Client";
import sharp from "sharp";
import { fileSizeExceededPayload } from "@/lib/storage/uploadLimits";
import {
  COMMUNICATION_UPLOAD_MAX_BYTES,
  DOCUMENT_CONTENT_TYPES,
  fileExtension,
  safeAttachmentBaseName,
} from "@/lib/communication/attachments";

// Vercel function 설정
export const maxDuration = 30; // 30초 타임아웃
export const runtime = "nodejs"; // Node.js 런타임 (Edge는 4MB 제한)
export const dynamic = "force-dynamic"; // 항상 동적 렌더링

// 허용되는 이미지 타입
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

// 확장자만 바꾼 실행 파일을 막기 위해 파일 앞부분이 형식과 맞는지 본다.
function matchesDocumentSignature(extension: string, buffer: Buffer): boolean {
  const startsWith = (signature: Buffer | string) =>
    buffer.subarray(0, signature.length).equals(Buffer.from(signature));

  switch (extension) {
    case "pdf":
      return startsWith("%PDF");
    case "docx":
    case "xlsx":
    case "pptx":
    case "hwpx":
    case "zip":
      return startsWith(ZIP_SIGNATURE);
    case "doc":
    case "xls":
    case "ppt":
      return startsWith(OLE_SIGNATURE);
    case "hwp":
      // 한글 5.x 는 OLE 컨테이너, 3.x 는 자체 헤더
      return startsWith(OLE_SIGNATURE) || startsWith("HWP Document File");
    case "rar":
      return startsWith("Rar!");
    case "txt":
      return !buffer.subarray(0, 1024).includes(0);
    default:
      return false;
  }
}

// POST: 커뮤니케이션 첨부 업로드 (이미지 + 문서)
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
      return NextResponse.json(
        { error: "파일이 제공되지 않았습니다" },
        { status: 400 },
      );
    }

    // 형식 검증: 이미지 또는 허용된 문서 확장자
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const extension = fileExtension(file.name);
    const documentContentType = DOCUMENT_CONTENT_TYPES[extension];
    if (!isImage && !documentContentType) {
      return NextResponse.json(
        {
          error:
            "이미지와 문서 파일(PDF·한글·오피스·ZIP)만 업로드 가능합니다.\n영상 및 기타 파일은 mkt@polarad.co.kr로 메일 발송 부탁드립니다.",
        },
        { status: 400 },
      );
    }

    // R2 설정 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error(
        "[Upload Communication] R2 설정 오류:",
        configError.message,
      );
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 },
      );
    }

    // 파일 크기 체크
    if (file.size > COMMUNICATION_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        fileSizeExceededPayload(COMMUNICATION_UPLOAD_MAX_BYTES),
        {
          status: 413,
        },
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(bytes);

    // 문서는 변환 없이 원본 그대로 저장한다.
    if (!isImage) {
      if (!matchesDocumentSignature(extension, buffer)) {
        return NextResponse.json(
          {
            error:
              "파일 내용이 확장자와 맞지 않습니다. 파일을 다시 저장한 뒤 올려주세요.",
          },
          { status: 400 },
        );
      }

      const documentName = `${Date.now()}-${safeAttachmentBaseName(file.name)}.${extension}`;
      const uploaded = await uploadToR2(
        buffer,
        documentName,
        documentContentType,
        `communication/${userId}`,
      );

      console.log("[Upload Communication] 문서 R2 업로드 완료:", uploaded.key);

      return NextResponse.json({
        success: true,
        // 한글 파일명이 들어간 키라서 주소는 인코딩해 돌려준다.
        url: encodeURI(uploaded.url),
        filename: documentName,
      });
    }

    // WebP로 자동 압축 (품질 85%, 메타데이터 제거)
    try {
      const compressedBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
      buffer = compressedBuffer;

      console.log(
        `[Upload Communication] 압축 완료: ${file.size} bytes -> ${buffer.length} bytes (${Math.round((1 - buffer.length / file.size) * 100)}% 감소)`,
      );
    } catch (compressionError) {
      console.error("[Upload Communication] 압축 오류:", compressionError);
      // 압축 실패 시 원본 사용
    }

    // R2에 업로드 (communication/userId 폴더에 저장)
    // 파일명을 .webp 확장자로 변경
    const originalName = file.name.replace(/\.[^/.]+$/, ".webp");
    const filename = generateFileName("communication", originalName);
    const { url } = await uploadToR2(
      buffer,
      filename,
      "image/webp",
      `communication/${userId}`,
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
      { status: 500 },
    );
  }
}
