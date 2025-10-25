import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { handleDesignUpload } from "@/lib/notification/notificationService";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 관리자 권한 확인
    const userRole = (session.user as any).role;
    if (!["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const workflowId = formData.get("workflowId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!workflowId) {
      return NextResponse.json({ error: "No workflow ID provided" }, { status: 400 });
    }

    // 워크플로우 존재 확인
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    // 파일 저장 디렉토리 생성
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "designs",
      workflowId
    );

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create directory:", error);
    }

    // 파일명 생성 (타임스탬프 + 원본 파일명)
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    // 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL 경로 생성
    const fileUrl = `/uploads/designs/${workflowId}/${fileName}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("POST /api/admin/upload-design error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
