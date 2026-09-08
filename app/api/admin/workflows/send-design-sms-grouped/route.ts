import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { callDataService } from "@/lib/d1/service-client";
import { dataServiceErrorResponse } from "@/lib/d1/route-errors";
import { getSMSClient, getSenderPhoneByAdmin } from "@/lib/sms/ncpSensClient";

interface SendData {
  userId: string;
  workflowIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Check admin authentication
    if (!session || !["super", "designer", "operator"].includes(userRole)) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { data } = body as { data: SendData[] };

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "발송 데이터가 필요합니다." },
        { status: 400 },
      );
    }

    if (isD1RuntimeEnabled()) {
      if (data.length > 200) return NextResponse.json({ error: "한 번에 최대 200명까지 발송할 수 있습니다." }, { status: 400 });
      const adminId = (session.user as any).id;
      const results: { userName: string; types: string[]; success: boolean; error?: string }[] = [];
      let successCount = 0;
      let failedCount = 0;
      const smsClient = getSMSClient();
      for (const item of data) {
        try {
          const result = await callDataService<{ user: { id: string; 이름: string; 연락처: string | null }; workflows: Array<Record<string, unknown>> }>("admin-notifications/grouped-design-data", { adminId, userId: item.userId, workflowIds: item.workflowIds });
          if (!result.user.연락처) throw new Error("연락처가 없습니다.");
          if (!result.workflows.length) throw new Error("발송 가능한 시안이 없습니다.");
          const types = result.workflows.map((w) => String(w.type));
          const message = types.length === 1 ? `[스타트패키지]\n\n${result.user.이름}님, ${types[0]} 디자인 시안이 업로드되었습니다.\n\n확인 부탁드립니다.` : `[스타트패키지]\n\n${result.user.이름}님, 디자인 시안이 업로드되었습니다.\n\n▶ 완료된 시안\n${types.map((t) => `- ${t}`).join("\n")}\n\n확인 부탁드립니다.`;
          const adminFrom = getSenderPhoneByAdmin(session.user?.email);
          await smsClient.sendSMS(result.user.연락처, message, "LMS", adminFrom ? { from: adminFrom } : undefined);
          await callDataService("admin-notifications/notification-create", { adminId, userId: result.user.id, type: "시안완료", channel: "SMS", title: "[스타트패키지] 시안 완료 알림", message, status: "성공", sentBy: adminId, sentByName: (session.user as any).name || "관리자" });
          successCount++; results.push({ userName: result.user.이름, types, success: true });
        } catch (error) { failedCount++; results.push({ userName: "처리 중 오류", types: [], success: false, error: "LMS 발송 실패" }); console.error("LMS 발송 실패:", error); }
      }
      return NextResponse.json({ success: successCount, failed: failedCount, details: results });
    }

    const results: {
      userName: string;
      types: string[];
      success: boolean;
      error?: string;
    }[] = [];

    let successCount = 0;
    let failedCount = 0;

    const smsClient = getSMSClient();

    // 각 고객별로 처리
    for (const item of data) {
      try {
        // 사용자 정보 조회
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: {
            id: true,
            이름: true,
            연락처: true,
          },
        });

        if (!user) {
          failedCount++;
          results.push({
            userName: "알 수 없음",
            types: [],
            success: false,
            error: "사용자를 찾을 수 없습니다.",
          });
          continue;
        }

        if (!user.연락처) {
          failedCount++;
          results.push({
            userName: user.이름,
            types: [],
            success: false,
            error: "연락처가 없습니다.",
          });
          continue;
        }

        // 선택된 워크플로우 조회
        const workflows = await prisma.workflow.findMany({
          where: {
            id: { in: item.workflowIds },
            userId: item.userId,
            시안URL: { not: null },
          },
          select: {
            id: true,
            type: true,
          },
        });

        if (workflows.length === 0) {
          failedCount++;
          results.push({
            userName: user.이름,
            types: [],
            success: false,
            error: "발송 가능한 시안이 없습니다.",
          });
          continue;
        }

        // 시안 타입 목록 생성
        const types = workflows.map((w) => w.type);

        // LMS 메시지 생성 (종합)
        let message: string;
        if (types.length === 1) {
          message = `[스타트패키지]\n\n${user.이름}님, ${types[0]} 디자인 시안이 업로드되었습니다.\n\n확인 부탁드립니다.`;
        } else {
          message = `[스타트패키지]\n\n${user.이름}님, 디자인 시안이 업로드되었습니다.\n\n▶ 완료된 시안\n${types.map((t) => `- ${t}`).join("\n")}\n\n확인 부탁드립니다.`;
        }

        // LMS 발송 (장문)
        const adminFrom = getSenderPhoneByAdmin(session.user?.email);
        await smsClient.sendSMS(
          user.연락처,
          message,
          "LMS",
          adminFrom ? { from: adminFrom } : undefined,
        );

        // Notification 로그 생성
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "시안완료",
            channel: "SMS",
            title: `[스타트패키지] 시안 완료 알림`,
            message,
            status: "성공",
            sentBy: (session.user as any).id,
            sentByName: (session.user as any).name || "관리자",
          },
        });

        successCount++;
        results.push({
          userName: user.이름,
          types,
          success: true,
        });

        console.log(
          `✅ 시안 완료 LMS 발송 성공: ${user.이름} (${types.join(", ")})`,
        );
      } catch (error: any) {
        failedCount++;
        results.push({
          userName: "처리 중 오류",
          types: [],
          success: false,
          error: "LMS 발송 실패",
        });
        console.error(
          `❌ LMS 발송 실패: ${String(error?.message || error).slice(0, 200)}`,
        );
      }
    }

    console.log(
      `📊 시안 SMS 일괄 발송 완료: 성공 ${successCount}건, 실패 ${failedCount}건`,
    );

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      details: results,
    });
  } catch (error: any) {
    const serviceError = dataServiceErrorResponse(error);
    if (serviceError) return serviceError;
    console.error("SMS 일괄 발송 에러:", error);
    return NextResponse.json(
      { error: "SMS 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
