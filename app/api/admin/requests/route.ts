import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { randomBytes } from "crypto";
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

    if (isD1RuntimeEnabled()) {
      const params = new URL(request.url).searchParams;
      const result = await callDataService<{ items: Array<Record<string, unknown>>; nextCursor?: string }>("admin-domain/requests-list", {
        adminId: (session.user as { id: string }).id,
        pageSize: params.get("pageSize") ?? undefined,
        cursor: params.get("cursor") ?? undefined,
      });
      return NextResponse.json({ requests: result.items }, result.nextCursor ? { headers: { "X-Next-Cursor": result.nextCursor } } : undefined);
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
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
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

    if (isD1RuntimeEnabled()) {
      const setupToken = action === "approve" ? randomBytes(32).toString("hex") : undefined;
      const result = await callDataService<Record<string, unknown>>("admin-domain/admin-request-review", {
        adminId: (session.user as { id: string }).id,
        requestId,
        action,
        rejectReason,
        assignedRole: assignedRole || "operator",
        ...(setupToken ? { setupToken } : {}),
      });
      if (action === "approve") {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
        return NextResponse.json({ message: "가입 신청이 승인되었습니다. 2FA 셋업 URL을 관리자에게 전달하세요.", email: result.email, setupUrl: `${baseUrl}/admin/setup-2fa?token=${setupToken}&email=${encodeURIComponent(String(result.email ?? ""))}` });
      }
      return NextResponse.json({ message: "가입 신청이 거부되었습니다." });
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

      // 2FA 셋업 토큰 생성
      const setupToken = randomBytes(32).toString("hex");

      await prisma.$transaction([
        // Admin 생성 (2FA 셋업 토큰 포함)
        prisma.admin.create({
          data: {
            email: adminRequest.email,
            password: adminRequest.password,
            name: adminRequest.name,
            role,
            twoFactorSetupToken: setupToken,
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

      // 2FA 셋업 URL 생성
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
      const setupUrl = `${baseUrl}/admin/setup-2fa?token=${setupToken}&email=${encodeURIComponent(adminRequest.email)}`;

      return NextResponse.json({
        message: "가입 신청이 승인되었습니다. 2FA 셋업 URL을 관리자에게 전달하세요.",
        email: adminRequest.email,
        setupUrl,
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
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("관리자 가입 신청 처리 오류:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
