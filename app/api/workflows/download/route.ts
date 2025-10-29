import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * GET /api/workflows/download?url={url}&filename={filename}
 *
 * 시안 파일 다운로드 프록시
 * CORS 문제를 해결하고 올바른 Content-Disposition 헤더를 설정
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "URL 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 다운로드
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "파일을 가져오는데 실패했습니다." },
        { status: fileResponse.status }
      );
    }

    // 파일 데이터 가져오기
    const fileBuffer = await fileResponse.arrayBuffer();

    // Content-Type 추출 (원본 파일의 타입 사용)
    const contentType =
      fileResponse.headers.get("content-type") || "application/octet-stream";

    // 파일 확장자 추출
    const urlExtension = fileUrl.split(".").pop()?.toLowerCase() || "";
    const extension = ["png", "jpg", "jpeg", "pdf", "webp"].includes(
      urlExtension
    )
      ? urlExtension
      : "png";

    // 최종 파일명 생성
    const finalFilename =
      filename || `시안_${new Date().toLocaleDateString("ko-KR")}.${extension}`;

    // 응답 생성
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          finalFilename
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("❌ 파일 다운로드 실패:", error);
    return NextResponse.json(
      { error: "파일 다운로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
