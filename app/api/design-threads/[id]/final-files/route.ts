import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileSizeExceededPayload } from "@/lib/storage/uploadLimits";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";

// R2 클라이언트 설정
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// GET: 최종 확정 파일 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;

    if (isD1RuntimeEnabled()) {
      const actor = session.user as { id: string; role?: string };
      return NextResponse.json(await callCore("final-files-list", actor.id, { userId: actor.id, threadId, actorType: ["super", "designer", "operator"].includes(actor.role || "") ? "admin" : "user" }));
    }

    const files = await prisma.designFinalFile.findMany({
      where: { threadId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("GET final-files error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: 최종 확정 파일 업로드 (관리자 전용, 다중 파일)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!["super", "designer", "operator"].includes(user.role)) {
      return NextResponse.json(
        { error: "관리자만 접근 가능합니다" },
        { status: 403 },
      );
    }

    const { id: threadId } = await params;

    let thread: { status: string } | null = null;
    if (!isD1RuntimeEnabled()) {
      thread = await prisma.designThread.findUnique({
        where: { id: threadId },
        select: { status: true },
      });

      if (!thread) {
        return NextResponse.json(
          { error: "스레드를 찾을 수 없습니다" },
          { status: 404 },
        );
      }

      if (thread.status !== "confirmed") {
        return NextResponse.json(
          { error: "확정된 시안에만 파일을 업로드할 수 있습니다" },
          { status: 400 },
        );
      }
    }

    // FormData 파싱
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "파일을 선택해주세요" },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      await callCore("final-file-create", user.id, {
        userId: user.id,
        threadId,
        actorType: "admin",
        dryRun: true,
      });
    }

    // 허용 파일 타입
    const allowedTypes = [
      "ai",
      "psd",
      "pdf",
      "eps",
      "svg", // 벡터/소스
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp", // 이미지
      "zip",
      "rar", // 압축
    ];

    const uploadedFiles = [];

    for (const file of files) {
      // 파일 확장자 확인
      const fileName = file.name;
      const fileExt = fileName.split(".").pop()?.toLowerCase() || "";

      if (!allowedTypes.includes(fileExt)) {
        return NextResponse.json(
          { error: `지원하지 않는 파일 형식입니다: ${fileExt}` },
          { status: 400 },
        );
      }

      // 파일 크기 체크 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        const sizeError = fileSizeExceededPayload(50 * 1024 * 1024);
        return NextResponse.json(
          {
            ...sizeError,
            error: `${fileName}: ${sizeError.error}`,
          },
          { status: 413 },
        );
      }

      // R2에 업로드
      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = Date.now();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
      const key = `final-files/${threadId}/${timestamp}_${safeFileName}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type || "application/octet-stream",
        }),
      );

      const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

      const savedFile = isD1RuntimeEnabled()
        ? await callCore("final-file-create", user.id, { userId: user.id, threadId, actorType: "admin", fileName, fileType: fileExt, fileSize: file.size, fileUrl })
        : await prisma.designFinalFile.create({
            data: { threadId, fileName, fileType: fileExt, fileSize: file.size, fileUrl, uploadedBy: user.id },
          });

      uploadedFiles.push(savedFile);
    }

    return NextResponse.json({
      message: `${uploadedFiles.length}개 파일이 업로드되었습니다`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("POST final-files error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: 최종 확정 파일 삭제 (관리자 전용)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    if (!["super", "designer", "operator"].includes(user.role)) {
      return NextResponse.json(
        { error: "관리자만 접근 가능합니다" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "파일 ID가 필요합니다" },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      return NextResponse.json(await callCore("final-file-delete", user.id, { userId: user.id, fileId, actorType: "admin" }));
    }

    await prisma.designFinalFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ message: "파일이 삭제되었습니다" });
  } catch (error) {
    console.error("DELETE final-files error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
