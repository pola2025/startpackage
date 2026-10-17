import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import {
  getObjectBuffer,
  deleteFromR2,
  validateR2Config,
  R2ObjectTooLargeError,
} from "@/lib/storage/r2Client";
import { processDisplayImage } from "@/lib/storage/displayImage";
import { fileSizeExceededPayload } from "@/lib/storage/uploadLimits";
import { isDisplayImageField } from "@/lib/constants/displayImageFields";

export const maxDuration = 30;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
/** 디자이너가 알아볼 수 있는 최소 크기 (짧은 변) */
const MIN_SIDE_PX = 200;

/**
 * POST: R2에 직접 업로드된 이미지 원본을 후처리 (로고 참고 이미지·기존 로고·사업자등록증 이미지)
 * - 원본은 슬랙으로 전송, 관리자 화면 표시용 webp 는 R2 에 저장
 * - 임시 원본은 지운다 (슬랙에 못 올린 원본은 따로 보관했다가 채널이 생기면 올린다)
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

    let body: { tempKey?: unknown; field?: unknown; filename?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
    }

    const field = String(body?.field ?? "");
    if (!isDisplayImageField(field)) {
      return NextResponse.json(
        { error: "지원하지 않는 필드입니다" },
        { status: 400 },
      );
    }
    tempKey = typeof body?.tempKey === "string" ? body.tempKey : undefined;
    const filename =
      typeof body?.filename === "string" && body.filename
        ? body.filename
        : "image.jpg";

    // IDOR 방지: 자신의 네임스페이스 임시 키만 처리
    if (!tempKey || !tempKey.startsWith(`${userId}/_tmp/`)) {
      return NextResponse.json(
        { error: "잘못된 업로드 참조입니다" },
        { status: 400 },
      );
    }

    let buffer: Buffer;
    try {
      buffer = await getObjectBuffer(tempKey, MAX_SIZE);
    } catch (error) {
      if (error instanceof R2ObjectTooLargeError) {
        await deleteFromR2(tempKey);
        return NextResponse.json(fileSizeExceededPayload(MAX_SIZE), {
          status: 413,
        });
      }
      return NextResponse.json(
        { error: "업로드된 원본을 찾을 수 없습니다. 다시 시도해주세요." },
        { status: 400 },
      );
    }

    if (buffer.length > MAX_SIZE) {
      await deleteFromR2(tempKey);
      return NextResponse.json(fileSizeExceededPayload(MAX_SIZE), {
        status: 413,
      });
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

    // 실제로 열리는 이미지인지, 알아볼 수 있는 크기인지 확인
    const metadata = await sharp(buffer).metadata().catch(() => null);
    if (!metadata?.width || !metadata?.height) {
      await deleteFromR2(tempKey);
      return NextResponse.json(
        { error: "이미지 파일을 열 수 없습니다. 다른 파일로 다시 올려 주세요." },
        { status: 400 },
      );
    }
    if (Math.min(metadata.width, metadata.height) < MIN_SIDE_PX) {
      await deleteFromR2(tempKey);
      return NextResponse.json(
        { error: `이미지가 너무 작습니다. 가로·세로 ${MIN_SIDE_PX}px 이상인 이미지를 올려 주세요.` },
        { status: 400 },
      );
    }

    const result = await processDisplayImage({
      userId,
      field,
      buffer,
      originalFilename: filename,
      contentType: detected.mime,
    });

    await deleteFromR2(tempKey);

    return NextResponse.json({
      url: result.url,
      slackSent: result.slackSent,
      needsWebpRegen: result.needsWebpRegen,
    });
  } catch (error) {
    console.error("[Image Finalize API] 오류:", error);
    if (tempKey) await deleteFromR2(tempKey).catch(() => {});
    return NextResponse.json(
      { error: "이미지 처리에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
