import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import {
  uploadToR2,
  generateFileName,
  validateR2Config,
} from "@/lib/storage/r2Client";
import {
  isSensitiveField,
  SENSITIVE_FIELD_LABELS,
  SLACK_ONLY_MARKER,
} from "@/lib/constants/sensitiveFields";
import { uploadSensitiveFileToSlack } from "@/lib/notification/slackClient";
import prisma from "@/lib/prisma";

// Vercel function 설정
export const maxDuration = 30; // 30초 타임아웃
export const runtime = "nodejs"; // Node.js 런타임 (Edge는 4MB 제한)
export const dynamic = "force-dynamic"; // 항상 동적 렌더링

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
        { status: 500 },
      );
    }

    const session = await auth();
    if (!session?.user) {
      console.log("[Upload API] 인증 실패: 세션 없음");
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    if (!userId) {
      console.log("[Upload API] User ID 없음");
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다" },
        { status: 400 },
      );
    }

    console.log("[Upload API] 사용자:", userId);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const field = formData.get("field") as string;

    console.log(
      "[Upload API] 필드:",
      field,
      "파일명:",
      file?.name,
      "파일 크기:",
      file?.size,
    );

    if (!file) {
      console.log("[Upload API] 파일 없음");
      return NextResponse.json(
        { error: "파일이 제공되지 않았습니다" },
        { status: 400 },
      );
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.log("[Upload API] 파일 크기 초과:", file.size);
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 },
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
          { status: 400 },
        );
      }
    }

    // 허용된 MIME 타입 확인
    const allowedTypes =
      ALLOWED_MIME_TYPES[field] || ALLOWED_MIME_TYPES.default;
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
        { status: 400 },
      );
    }

    // 🔐 민감 파일 처리: R2 저장 없이 슬랙으로 직접 전송
    if (isSensitiveField(field)) {
      console.log(`🔐 [Upload API] 민감 파일 감지: ${field}`);

      // 사용자의 슬랙 채널 ID 조회
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { slackChannelId: true, 이름: true },
      });

      if (!user?.slackChannelId) {
        console.log("[Upload API] 슬랙 채널 없음 - 기본 정보 먼저 제출 필요");
        return NextResponse.json(
          {
            error:
              "슬랙 채널이 생성되지 않았습니다. 기본 정보(브랜드명, 업종, 주소)를 먼저 제출해주세요.",
          },
          { status: 400 },
        );
      }

      // 메모리에서 바로 슬랙으로 전송
      const label =
        SENSITIVE_FIELD_LABELS[field as keyof typeof SENSITIVE_FIELD_LABELS];
      const extension = file.name.split(".").pop() || "file";
      const slackFileName = `${label}_${Date.now()}.${extension}`;

      console.log(`🔐 [Upload API] 슬랙 전송 시작: ${slackFileName}`);

      const success = await uploadSensitiveFileToSlack({
        channelId: user.slackChannelId,
        buffer,
        fileName: slackFileName,
        title: label,
        userName: user.이름,
      });

      if (!success) {
        console.error("[Upload API] 슬랙 전송 실패");
        return NextResponse.json(
          { error: "슬랙 전송에 실패했습니다. 다시 시도해주세요." },
          { status: 500 },
        );
      }

      console.log(`✅ [Upload API] 민감 파일 슬랙 전송 완료 (R2 저장 안 함)`);

      // 성공 시 "SLACK_ONLY" 마커 반환 (R2 URL이 아님)
      return NextResponse.json({
        url: SLACK_ONLY_MARKER,
        filename: file.name,
        mimeType: actualMimeType,
        sensitive: true,
        message:
          "파일이 슬랙으로 안전하게 전송되었습니다. 서버에는 저장되지 않습니다.",
      });
    }

    // 📸 프로필 사진은 presigned 직접 업로드 경로(/api/upload/presign → /api/upload/profile-finalize)로 처리됨
    //    (원본 20MB까지 Vercel 함수를 우회해 R2에 직접 업로드하기 위함)

    // 일반 파일: R2에 업로드
    console.log("[Upload API] R2 업로드 시작");
    const filename = generateFileName(field, file.name);

    const { url, key } = await uploadToR2(
      buffer,
      filename,
      actualMimeType,
      userId,
    );

    console.log("[Upload API] R2 업로드 완료");
    console.log("[Upload API] 공개 URL:", url);
    console.log("[Upload API] R2 Key:", key);

    return NextResponse.json({
      url,
      filename,
      mimeType: actualMimeType,
      key,
    });
  } catch (error: any) {
    console.error("[Upload API] 치명적 오류:", error);
    console.error("[Upload API] 오류 스택:", error?.stack);
    return NextResponse.json(
      {
        error: "파일 업로드에 실패했습니다",
        details: error?.message || "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
