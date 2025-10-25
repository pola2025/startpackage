import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/requests
 * 관리자 가입 신청 목록 조회 (관리자 전용)
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !["super", "designer", "operator"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const requests = await prisma.adminRequest.findMany({
      where: {
        status: status as "pending" | "approved" | "rejected",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        rejectReason: true,
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("관리자 가입 신청 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/requests
 * 관리자 가입 신청 승인/거부 (super 관리자 전용)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    // super 관리자만 승인/거부 가능
    if (!session || (session.user as any).role !== "super") {
      return NextResponse.json(
        { error: "최고 관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action, rejectReason, assignedRole } = body;

    // 입력 검증
    if (!requestId || !action) {
      return NextResponse.json(
        { error: "필수 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "잘못된 작업입니다." },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejectReason) {
      return NextResponse.json(
        { error: "거부 사유를 입력해주세요." },
        { status: 400 }
      );
    }

    // 가입 신청 조회
    const adminRequest = await prisma.adminRequest.findUnique({
      where: { id: requestId },
    });

    if (!adminRequest) {
      return NextResponse.json(
        { error: "가입 신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (adminRequest.status !== "pending") {
      return NextResponse.json(
        { error: "이미 처리된 신청입니다." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // 승인: Admin 테이블에 추가
      const role = assignedRole || "operator";

      if (!["super", "designer", "operator"].includes(role)) {
        return NextResponse.json(
          { error: "잘못된 권한입니다." },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        // Admin 생성
        prisma.admin.create({
          data: {
            email: adminRequest.email,
            password: adminRequest.password,
            name: adminRequest.name,
            role,
          },
        }),
        // AdminRequest 상태 업데이트
        prisma.adminRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            reviewedBy: (session.user as any).id,
            reviewedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({
        message: "가입 신청이 승인되었습니다.",
        email: adminRequest.email,
      });
    } else {
      // 거부
      await prisma.adminRequest.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          reviewedBy: (session.user as any).id,
          reviewedAt: new Date(),
          rejectReason,
        },
      });

      return NextResponse.json({
        message: "가입 신청이 거부되었습니다.",
      });
    }
  } catch (error) {
    console.error("관리자 가입 신청 처리 오류:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
