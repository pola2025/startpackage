import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callCore } from "@/lib/d1/core-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";

const MAX_DOWNLOAD_COUNT = 100;

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename");

    if (!workflowId || !fileUrl) {
      return NextResponse.json(
        { error: "workflowId와 url 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      const workflow = await callCore<{ type: string; 시안URL: string; 다운로드횟수: number }>("workflow-download", session.user.id, { userId: session.user.id, workflowId, fileUrl });
      const target = new URL(fileUrl);
      const publicOrigin = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).origin : "";
      if (target.protocol !== "https:" || !publicOrigin || target.origin !== publicOrigin) return NextResponse.json({ error: "허용되지 않은 파일 주소입니다." }, { status: 400 });
      const fileResponse = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(15_000) });
      if (!fileResponse.ok) return NextResponse.json({ error: "파일을 가져오는데 실패했습니다." }, { status: fileResponse.status });
      const contentLength = Number(fileResponse.headers.get("content-length") || 0);
      if (contentLength > 50 * 1024 * 1024) return NextResponse.json({ error: "파일 용량이 제한을 초과했습니다.", maxBytes: 50 * 1024 * 1024 }, { status: 413 });
      const fileBuffer = await fileResponse.arrayBuffer();
      if (fileBuffer.byteLength > 50 * 1024 * 1024) return NextResponse.json({ error: "파일 용량이 제한을 초과했습니다.", maxBytes: 50 * 1024 * 1024 }, { status: 413 });
      const extension = ["png", "jpg", "jpeg", "pdf", "webp"].includes(target.pathname.split(".").pop()?.toLowerCase() || "") ? target.pathname.split(".").pop()!.toLowerCase() : "png";
      const finalFilename = filename || `시안_${new Date().toLocaleDateString("ko-KR")}.${extension}`;
      const updated = await callCore<{ 다운로드횟수: number }>("workflow-download", session.user.id, { userId: session.user.id, workflowId, fileUrl, increment: true });
      return new NextResponse(fileBuffer, { headers: { "Content-Type": fileResponse.headers.get("content-type") || "application/octet-stream", "Content-Disposition": `attachment; filename="${encodeURIComponent(finalFilename)}"`, "Cache-Control": "no-cache", "X-Download-Count": String(updated.다운로드횟수), "X-Download-Max": String(MAX_DOWNLOAD_COUNT) } });
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: {
        id: true,
        userId: true,
        type: true,
        시안URL: true,
        다운로드횟수: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (workflow.userId !== session.user.id) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (workflow.시안URL !== fileUrl) {
      return NextResponse.json(
        { error: "유효하지 않은 파일 URL입니다." },
        { status: 400 },
      );
    }

    if (workflow.다운로드횟수 >= MAX_DOWNLOAD_COUNT) {
      return NextResponse.json(
        {
          error: `다운로드 횟수가 한도(${MAX_DOWNLOAD_COUNT}회)에 도달했습니다.`,
          downloadCount: workflow.다운로드횟수,
          maxCount: MAX_DOWNLOAD_COUNT,
        },
        { status: 403 },
      );
    }

    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "파일을 가져오는데 실패했습니다." },
        { status: fileResponse.status },
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType =
      fileResponse.headers.get("content-type") || "application/octet-stream";

    const urlExtension = fileUrl.split(".").pop()?.toLowerCase() || "";
    const extension = ["png", "jpg", "jpeg", "pdf", "webp"].includes(
      urlExtension,
    )
      ? urlExtension
      : "png";

    const finalFilename =
      filename || `시안_${new Date().toLocaleDateString("ko-KR")}.${extension}`;

    await prisma.workflow.update({
      where: { id: workflowId },
      data: { 다운로드횟수: { increment: 1 } },
    });

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          finalFilename,
        )}"`,
        "Cache-Control": "no-cache",
        "X-Download-Count": String(workflow.다운로드횟수 + 1),
        "X-Download-Max": String(MAX_DOWNLOAD_COUNT),
      },
    });
  } catch (error) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("❌ 파일 다운로드 실패:", error);
    return NextResponse.json(
      { error: "파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
