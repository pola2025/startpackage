import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import {
  getObjectBuffer,
  deleteFromR2,
  validateR2Config,
} from "@/lib/storage/r2Client";
import { processProfilePhoto } from "@/lib/storage/profileUpload";

export const maxDuration = 30;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/**
 * POST: R2에 직접 업로드된 프로필 원본을 후처리
 * - R2 임시 원본 읽기 → 파일타입/크기 재검증
 * - 원본을 슬랙으로 전송(디자인용) + 표시용 webp(~200KB) R2 저장
 * - 임시 원본 삭제
 */
export async function POST(request: Request) {
  let tempKey: string | undefined;
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

    tempKey = body?.tempKey;
    const filename = body?.filename || "profile.jpg";

    // IDOR 방지: 자신의 네임스페이스 임시 키만 처리
    if (!tempKey || !tempKey.startsWith(`${userId}/_tmp/`)) {
      return NextResponse.json(
        { error: "잘못된 업로드 참조입니다" },
        { status: 400 },
      );
    }

    // R2에서 원본 읽기
    let buffer: Buffer;
    try {
      buffer = await getObjectBuffer(tempKey);
    } catch {
      return NextResponse.json(
        { error: "업로드된 원본을 찾을 수 없습니다. 다시 시도해주세요." },
        { status: 400 },
      );
    }

    // 크기 재검증
    if (buffer.length > MAX_SIZE) {
      await deleteFromR2(tempKey);
      return NextResponse.json(
        { error: "파일 크기는 20MB 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 실제 파일 타입 검증 (Magic Number)
    const detected = await fileTypeFromBuffer(buffer).catch(() => null);
    if (!detected || !ALLOWED_MIME.includes(detected.mime)) {
      await deleteFromR2(tempKey);
      return NextResponse.json(
        { error: "이미지 파일만 업로드할 수 있습니다 (JPG/PNG/WEBP)" },
        { status: 400 },
      );
    }

    // 슬랙 원본 전송 + webp R2 저장
    const result = await processProfilePhoto({
      userId,
      buffer,
      originalFilename: filename,
    });

    // 임시 원본 삭제 (표시용 webp만 R2에 남김)
    await deleteFromR2(tempKey);

    return NextResponse.json({
      url: result.url,
      slackSent: result.slackSent,
      needsWebpRegen: result.needsWebpRegen,
    });
  } catch (error: any) {
    console.error("[Profile Finalize API] 오류:", error);
    if (tempKey) await deleteFromR2(tempKey).catch(() => {});
    return NextResponse.json(
      {
        error: "프로필 사진 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}
