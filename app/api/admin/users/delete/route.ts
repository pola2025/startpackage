import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { deleteMultipleFromR2 } from "@/lib/storage/r2Client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "사용자 ID가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🗑️ 사용자 삭제 시작: ${userId}`);

    // 1. Submission에서 파일 URL 수집
    const submission = await prisma.submission.findUnique({
      where: { userId },
    });

    const fileUrls: string[] = [];

    if (submission) {
      // Submission의 파일 필드들
      const submissionFileFields = [
        submission.사업자등록증URL,
        submission.프로필사진URL,
        submission.로고URL,
        submission.대표자신분증URL,
        submission.통신서비스이용증명원URL,
        submission.신용카드앞면URL,
        submission.로고예시디자인URL,
      ];

      submissionFileFields.forEach((url) => {
        if (url) fileUrls.push(url);
      });

      console.log(`📋 Submission 파일: ${fileUrls.length}개`);
    }

    // 2. Workflow를 통해 DesignHistory 파일 URL 수집
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        designHistory: true,
      },
    });

    workflows.forEach((workflow) => {
      workflow.designHistory.forEach((history) => {
        if (history.fileUrl) {
          fileUrls.push(history.fileUrl);
        }
      });
    });

    const totalDesignFiles = workflows.reduce(
      (sum, w) => sum + w.designHistory.length,
      0
    );
    console.log(`🎨 Design History 파일: ${totalDesignFiles}개`);
    console.log(`📦 총 파일 개수: ${fileUrls.length}개`);

    // 3. R2에서 파일 삭제
    if (fileUrls.length > 0) {
      await deleteMultipleFromR2(fileUrls);
      console.log(`✅ R2 파일 삭제 완료`);
    }

    // 4. DB에서 사용자 삭제 (cascade delete will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`✅ 사용자 DB 삭제 완료: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "사용자와 관련 파일이 모두 삭제되었습니다.",
      deletedFiles: fileUrls.length,
    });
  } catch (error: any) {
    console.error("사용자 삭제 에러:", error);
    return NextResponse.json(
      { error: "사용자 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
