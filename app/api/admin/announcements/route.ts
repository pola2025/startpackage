import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 공지사항 목록 조회 (관리자)
export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 공지사항 작성 (관리자) + 이메일 발송
export async function POST(request: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const adminName = (session.user as any).name;
    const body = await request.json();
    const { title, content, imageUrls = [], youtubeUrl, published = true } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요" },
        { status: 400 }
      );
    }

    // 공지사항 생성
    const announcement = await prisma.announcement.create({
      data: {
        authorId: adminId,
        authorName: adminName,
        title,
        content,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
        youtubeUrl: youtubeUrl || null,
        published,
      },
    });

    // 발행 상태이면 이메일 수신 동의한 사용자들에게 이메일 발송
    if (published) {
      try {
        // 이메일 수신 동의한 사용자 조회
        const users = await prisma.user.findMany({
          where: {
            공지사항이메일수신: true,
          },
          select: {
            이름: true,
            email: true,
          },
        });

        console.log(`공지사항 이메일 발송 대상: ${users.length}명`);

        // 이메일 발송
        const { sendEmail } = await import("@/lib/email/resendClient");

        // 이미지 HTML 생성 (여러 이미지 지원)
        const imagesHtml = imageUrls && imageUrls.length > 0
          ? `<div style="margin: 20px 0;">
               ${imageUrls.map((url: string) =>
                 `<img src="${process.env.NEXTAUTH_URL}${url}" alt="${title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 10px; display: block;" />`
               ).join('')}
             </div>`
          : '';

        // 유튜브 HTML 생성
        const youtubeHtml = youtubeUrl
          ? `<div style="margin: 20px 0;">
               <p style="font-weight: 600; color: #1f2937; margin-bottom: 10px;">📺 관련 영상:</p>
               <a href="${youtubeUrl}" style="color: #dc2626; text-decoration: none; font-weight: 500;">
                 ${youtubeUrl}
               </a>
             </div>`
          : '';

        // 각 사용자에게 개별 발송 (이름 대표님으로 개인화)
        const emailPromises = users.map((user) =>
          sendEmail({
            to: user.email,
            subject: `[스타트패키지] ${title}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
                  마케팅 소식
                </h2>
                <p style="font-size: 16px; color: #374151;">
                  안녕하세요, <strong>${user.이름} 대표님!</strong>
                </p>
                <div style="background-color: #f9fafb; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #1f2937; margin-top: 0;">${title}</h3>
                  ${imagesHtml}
                  <div style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">
${content}
                  </div>
                  ${youtubeHtml}
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                <p style="font-size: 14px; color: #6b7280;">
                  대시보드에서 더 많은 마케팅 소식을 확인하세요:<br />
                  <a href="${process.env.NEXTAUTH_URL}/dashboard/announcements" style="color: #dc2626; text-decoration: none;">
                    공지사항 바로가기 →
                  </a>
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
                  이메일 수신을 원하지 않으시면 <a href="${process.env.NEXTAUTH_URL}/dashboard/announcements" style="color: #6b7280;">설정</a>에서 변경하실 수 있습니다.
                </p>
              </div>
            `,
          })
        );

        await Promise.all(emailPromises);
        console.log(`공지사항 이메일 발송 완료: ${users.length}명`);
      } catch (error) {
        console.error("공지사항 이메일 발송 실패:", error);
        // 이메일 발송 실패해도 공지사항 작성은 성공으로 처리
      }
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error) {
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
