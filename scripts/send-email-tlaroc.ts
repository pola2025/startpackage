/**
 * tlaroc2020@naver.com 별도 안내 이메일 발송
 */
import { config } from "dotenv";
config({ path: ".env" });

const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>자동화서비스 만료 안내</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">📢 자동화서비스 만료 안내</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                안녕하세요.<br>
                폴라애드입니다.
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                2025년 12월 31일부로 자동화서비스 지원기간이 만료됩니다.<br>
                그동안 이용해주셔서 감사합니다.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 14px; color: #333333; font-weight: 600;">[종료 서비스]</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #495057; line-height: 1.8;">
                      <li>Meta 실시간 알림서비스</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6c757d;">
                폴라애드
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

async function send() {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "폴라애드 <noreply@polaai.co.kr>",
      to: ["tlaroc2020@naver.com"],
      subject: "자동화서비스 만료 안내",
      html: emailHtml,
    }),
  });
  const data = await res.json();
  console.log("이메일 발송:", res.ok ? "✅ 성공" : "❌ 실패");
  console.log("수신자: tlaroc2020@naver.com");
  console.log("Message ID:", data.id);
}

send();
