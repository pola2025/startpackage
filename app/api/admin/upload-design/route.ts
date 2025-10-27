import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleDesignUpload } from "@/lib/notification/notificationService";
import { uploadToR2, generateFileName, validateR2Config } from "@/lib/storage/r2Client";

// Vercel function 설정
export const maxDuration = 30; // 30초 타임아웃
export const runtime = "nodejs"; // Node.js 런타임 (Edge는 4MB 제한)
export const dynamic = "force-dynamic"; // 항상 동적 렌더링

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

    // R2 설정 검증
    try {
      validateR2Config();
    } catch (configError: any) {
      console.error("[Upload Design] R2 설정 오류:", configError.message);
      return NextResponse.json(
        { error: "스토리지 설정 오류", details: configError.message },
        { status: 500 }
      );
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB" },
        { status: 400 }
      );
    }

    // 파일 버퍼 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // R2에 업로드 (designs/workflowId/ 폴더에 저장)
    const fileName = generateFileName(`design-${workflowId}`, file.name);
    const { url: fileUrl } = await uploadToR2(
      buffer,
      fileName,
      file.type || "application/octet-stream",
      `designs/${workflowId}`
    );

    console.log("[Upload Design] R2 업로드 완료:", fileUrl);

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("POST /api/admin/upload-design error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
