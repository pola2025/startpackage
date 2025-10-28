import { sendEmail } from "@/lib/email/resendClient";
import prisma from "@/lib/prisma";

type ContentTip = {
  id: string;
  title: string;
  description: string;
  linkType: string;
  linkUrl: string;
};

/**
 * 새 콘텐츠 팁 등록 시 이메일 알림 발송
 */
export async function sendContentTipNotifications(
  tip: ContentTip
): Promise<void> {
  try {
    console.log(
      `📧 콘텐츠 팁 이메일 알림 발송 시작: ${tip.title}`
    );

    // 콘텐츠팁 이메일 수신 동의한 사용자 조회
    const users = await prisma.user.findMany({
      where: {
        콘텐츠팁이메일수신: true,
      },
      select: {
        id: true,
        이름: true,
        email: true,
      },
    });

    if (users.length === 0) {
      console.log("📧 이메일 수신 동의한 사용자가 없습니다.");
      return;
    }

    console.log(`📧 이메일 발송 대상: ${users.length}명`);

    // 각 사용자에게 이메일 발송
    const emailPromises = users.map(async (user) => {
      if (!user.email) return;

      const html = getContentTipEmailHTML({
        userName: user.이름 || "회원",
        tipTitle: tip.title,
        tipDescription: tip.description,
        tipType: tip.linkType === "youtube" ? "유튜브 영상" : "블로그 글",
        tipUrl: tip.linkUrl,
      });

      return sendEmail({
        to: user.email,
        subject: `[비즈액터스쿨] 새로운 콘텐츠 제작 Tip: ${tip.title}`,
        html,
      });
    });

    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;
    const failCount = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value === false)
    ).length;

    console.log(
      `✅ 콘텐츠 팁 이메일 발송 완료: 성공 ${successCount}건, 실패 ${failCount}건`
    );
  } catch (error) {
    console.error("콘텐츠 팁 이메일 알림 발송 실패:", error);
    throw error;
  }
}

/**
 * 콘텐츠 팁 이메일 HTML 템플릿
 */
function getContentTipEmailHTML(params: {
  userName: string;
  tipTitle: string;
  tipDescription: string;
  tipType: string;
  tipUrl: string;
}): string {
  const { userName, tipTitle, tipDescription, tipType, tipUrl } = params;

  const typeIcon = tipType === "유튜브 영상" ? "🎥" : "📝";
  const typeColor = tipType === "유튜브 영상" ? "#ff0000" : "#0066cc";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>새로운 콘텐츠 제작 Tip</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">💡 새로운 콘텐츠 제작 Tip</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                    안녕하세요, <strong>${userName}</strong>님!
                  </p>

                  <p style="margin: 0 0 30px; font-size: 16px; color: #333333; line-height: 1.6;">
                    유용한 콘텐츠 제작 팁이 새로 등록되었습니다.
                  </p>

                  <!-- Tip Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 8px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 24px;">
                        <div style="display: inline-block; padding: 6px 12px; background-color: ${typeColor}; color: #ffffff; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">
                          ${typeIcon} ${tipType}
                        </div>

                        <h2 style="margin: 0 0 16px; font-size: 20px; color: #1f2937; font-weight: 700; line-height: 1.3;">
                          ${tipTitle}
                        </h2>

                        <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                          ${tipDescription}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="${tipUrl}"
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          ${typeIcon} 바로 확인하기
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                          💡 더 많은 콘텐츠 제작 팁은 대시보드에서 확인하실 수 있습니다.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; font-size: 14px; color: #6c757d;">
                    비즈액터스쿨 스타트패키지
                  </p>
                  <p style="margin: 0 0 10px; font-size: 12px; color: #adb5bd;">
                    이 메일은 발신 전용입니다. 문의사항은 대시보드를 이용해주세요.
                  </p>
                  <p style="margin: 0; font-size: 11px; color: #adb5bd;">
                    이메일 수신을 원하지 않으시면 대시보드 설정에서 알림을 해제할 수 있습니다.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
