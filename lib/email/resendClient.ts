import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Resend를 사용하여 이메일 발송
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<boolean> {
  try {
    if (!resend) {
      console.error("Resend API 키가 설정되지 않았습니다.");
      return false;
    }

    const { to, subject, html, from = "스타트패키지 <noreply@polaai.co.kr>" } = params;

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("이메일 발송 실패:", error);
      return false;
    }

    console.log(`✅ 이메일 발송 성공: ${to} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error("이메일 발송 오류:", error);
    return false;
  }
}

/**
 * 시안 완료 이메일 템플릿
 */
export function getDesignCompleteEmailHTML(params: {
  userName: string;
  workflowCount: number;
}): string {
  const { userName, workflowCount } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>시안 완료 안내</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎨 시안이 완료되었습니다</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                    안녕하세요, <strong>${userName}</strong>님!
                  </p>

                  <p style="margin: 0 0 30px; font-size: 16px; color: #333333; line-height: 1.6;">
                    디자인 시안이 업로드되었습니다.<br>
                    대시보드에서 확인하신 후 발주를 진행해주세요.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <a href="https://polaai.co.kr/dashboard/workflows"
                           style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                          시안 확인하기
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #856404; font-weight: 600;">⚠️ 발주 전 필독사항</p>
                        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #856404; line-height: 1.6;">
                          <li>발주 후 정보 변경이 불가합니다</li>
                          <li>오탈자를 꼼꼼히 확인해주세요</li>
                          <li>무료 수정은 2회까지 가능합니다</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; font-size: 14px; color: #6c757d;">
                    스타트패키지
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #adb5bd;">
                    이 메일은 발신 전용입니다. 문의사항은 대시보드를 이용해주세요.
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

/**
 * 제작요청 접수 이메일 템플릿
 */
export function getSubmissionCompleteEmailHTML(params: {
  userName: string;
  expectedDate: string;
}): string {
  const { userName, expectedDate } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>제작요청 접수 완료</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">✅ 제작요청이 접수되었습니다</h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                    안녕하세요, <strong>${userName}</strong>님!
                  </p>

                  <p style="margin: 0 0 30px; font-size: 16px; color: #333333; line-height: 1.6;">
                    디자인 시안 제작요청이 정상적으로 접수되었습니다.<br>
                    영업일 기준 2일 이내에 시안을 제작하여 안내드리겠습니다.
                  </p>

                  <!-- Info Box -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3ff; border-left: 4px solid #2196f3; border-radius: 4px;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0 0 10px; font-size: 14px; color: #0d47a1; font-weight: 600;">📅 예상 시안 전달일</p>
                        <p style="margin: 0; font-size: 18px; color: #1565c0; font-weight: 700;">${expectedDate}</p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 30px 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                    시안이 완료되면 SMS와 이메일로 안내드리겠습니다.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; font-size: 14px; color: #6c757d;">
                    스타트패키지
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #adb5bd;">
                    이 메일은 발신 전용입니다. 문의사항은 대시보드를 이용해주세요.
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
