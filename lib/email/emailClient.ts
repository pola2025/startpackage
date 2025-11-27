/**
 * 이메일 발송 클라이언트
 * Resend API를 사용하여 이메일 발송
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface EmailAttachment {
  filename: string;
  path?: string;
  content?: string;
}

interface SendEmailWithAttachmentsParams extends SendEmailParams {
  attachments?: EmailAttachment[];
}

/**
 * 이메일 발송
 */
export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY가 설정되지 않았습니다. 이메일을 발송하지 않습니다.");
    // 개발 환경에서는 경고만 하고 성공으로 처리
    if (process.env.NODE_ENV === "development") {
      console.log("📧 [개발 모드] 이메일 발송 시뮬레이션:", { to, subject, html });
      return { success: true, messageId: "dev-" + Date.now() };
    }
    throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: from || "스타트패키지 <noreply@polaai.co.kr>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Resend API 오류:", error);
      throw new Error(error.message || "이메일 발송 실패");
    }

    const data = await response.json();
    console.log("✅ 이메일 발송 성공:", { to, subject, messageId: data.id });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error("❌ 이메일 발송 실패:", error);
    throw new Error(error.message || "이메일 발송 중 오류가 발생했습니다.");
  }
}

/**
 * 첨부파일과 함께 이메일 발송
 */
export async function sendEmailWithAttachments({
  to,
  subject,
  html,
  from,
  attachments,
}: SendEmailWithAttachmentsParams) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY가 설정되지 않았습니다. 이메일을 발송하지 않습니다.");
    if (process.env.NODE_ENV === "development") {
      console.log("📧 [개발 모드] 이메일 발송 시뮬레이션:", { to, subject, html, attachments });
      return { success: true, messageId: "dev-" + Date.now() };
    }
    throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
  }

  try {
    // 첨부파일 처리 (URL에서 파일 다운로드하여 base64로 변환)
    let processedAttachments: Array<{ filename: string; content: string }> = [];

    if (attachments && attachments.length > 0) {
      console.log(`📎 첨부파일 ${attachments.length}개 처리 중...`);

      for (const attachment of attachments) {
        if (attachment.path) {
          try {
            // URL에서 파일 다운로드
            const response = await fetch(attachment.path);
            if (!response.ok) {
              console.error(`❌ 첨부파일 다운로드 실패: ${attachment.filename}`);
              continue;
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64Content = Buffer.from(arrayBuffer).toString("base64");

            processedAttachments.push({
              filename: attachment.filename,
              content: base64Content,
            });

            console.log(`✅ 첨부파일 처리 완료: ${attachment.filename}`);
          } catch (error) {
            console.error(`❌ 첨부파일 처리 오류 (${attachment.filename}):`, error);
          }
        } else if (attachment.content) {
          processedAttachments.push({
            filename: attachment.filename,
            content: attachment.content,
          });
        }
      }
    }

    const emailPayload: Record<string, unknown> = {
      from: from || "스타트패키지 <noreply@polaai.co.kr>",
      to: [to],
      subject,
      html,
    };

    // 첨부파일이 있으면 추가
    if (processedAttachments.length > 0) {
      emailPayload.attachments = processedAttachments;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Resend API 오류:", error);
      throw new Error(error.message || "이메일 발송 실패");
    }

    const data = await response.json();
    console.log("✅ 이메일 발송 성공:", {
      to,
      subject,
      messageId: data.id,
      attachmentCount: processedAttachments.length,
    });

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error("❌ 이메일 발송 실패:", error);
    throw new Error(error.message || "이메일 발송 중 오류가 발생했습니다.");
  }
}

/**
 * 여러 수신자에게 이메일 발송
 */
export async function sendBulkEmail(params: SendEmailParams[]) {
  const results = await Promise.allSettled(
    params.map((param) => sendEmail(param))
  );

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const failureCount = results.filter((r) => r.status === "rejected").length;

  return {
    total: results.length,
    success: successCount,
    failed: failureCount,
    results,
  };
}

export default {
  sendEmail,
  sendEmailWithAttachments,
  sendBulkEmail,
};
