/**
 * 자동화서비스 만료 안내 - 문자 및 이메일 발송 스크립트
 * 실행: npx tsx scripts/send-expiry-notifications.ts
 */

import { config } from "dotenv";
config({ path: ".env" });

import { sendSMS } from "../lib/sms/ncpSensClient";

// 발송 대상자 목록
const recipients = [
  { name: "김지완", phone: "01051814465", email: "kyjkyj4465@gmail.com" },
  { name: "김민수", phone: "01079257958", email: "ksenanrkd@naver.com" },
  { name: "정승화", phone: "01052228176", email: "hare_guu@naver.com" },
  { name: "이빈", phone: "01086630131", email: "matrixbin@naver.com" },
  { name: "유희강", phone: "01031931001", email: "yhk7205@naver.com" },
  { name: "안정현", phone: "01052447919", email: "dksxlawkd7919@naver.com" },
];

// 문자 메시지 생성 (이모지 제거 - NCP SENS 미지원)
function getSMSContent(name: string): string {
  return `[스타트패키지] 자동화서비스 만료 안내

안녕하세요, ${name} 대표님.
스타트패키지를 이용해 주셔서 감사합니다.

[안내] 2025년 12월 31일부로 자동화서비스 지원이 만료됩니다.

[종료 예정 서비스]
- Meta 광고 리포트
- 광고 게재
- 자동 알림 서비스

종료 이후에도 유료로 서비스를 계속 이용하실 수 있습니다.

[요금 안내] (VAT 포함)
- 3개월: 월 22만원 (합계 66만원)
- 6개월: 월 16.5만원 (합계 99만원) 25% 할인
- 12개월: 월 11만원 (합계 132만원) 50% 할인

[결제 방법]
- 계좌이체: 우리은행 1005-302-954803 (주)폴라애드
- 카드결제: https://booking.naver.com/booking/5/bizes/1304508/items/6516411

서비스 연장 문의는 이 번호로 연락주세요.`;
}

// 이메일 HTML 생성
function getEmailHTML(name: string): string {
  return `<!DOCTYPE html>
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
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">📢 자동화서비스 만료 안내</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                안녕하세요, <strong>${name} 대표님</strong>.
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                스타트패키지를 이용해 주셔서 감사합니다.
              </p>

              <!-- 만료 안내 박스 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 16px; color: #856404; font-weight: 600;">
                      ⚠️ 2025년 12월 31일부로 자동화서비스 지원이 만료됩니다.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- 종료 서비스 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 4px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 15px; font-size: 14px; color: #333333; font-weight: 600;">📋 종료 예정 서비스</p>
                    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #495057; line-height: 1.8;">
                      <li>Meta 광고 리포트</li>
                      <li>광고 게재</li>
                      <li>자동 알림 서비스</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                종료 이후에도 <strong>유료로 서비스를 계속 이용</strong>하실 수 있습니다.
              </p>

              <!-- 요금표 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #667eea;">
                  <th style="padding: 15px; color: #ffffff; font-size: 14px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">결제 기간</th>
                  <th style="padding: 15px; color: #ffffff; font-size: 14px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">월 비용</th>
                  <th style="padding: 15px; color: #ffffff; font-size: 14px; text-align: center; border-right: 1px solid rgba(255,255,255,0.2);">합계</th>
                  <th style="padding: 15px; color: #ffffff; font-size: 14px; text-align: center;">할인</th>
                </tr>
                <tr style="background-color: #ffffff;">
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6;">3개월</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600;">22만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600;">66만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d;">-</td>
                </tr>
                <tr style="background-color: #f8f9fa;">
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6;">6개월</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600;">16.5만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600;">99만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-top: 1px solid #dee2e6; color: #28a745; font-weight: 600;">25% ↓</td>
                </tr>
                <tr style="background-color: #e8f5e9;">
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600;">12개월 추천</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600; color: #1565c0;">11만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-right: 1px solid #dee2e6; border-top: 1px solid #dee2e6; font-weight: 600; color: #1565c0;">132만원</td>
                  <td style="padding: 15px; font-size: 14px; text-align: center; border-top: 1px solid #dee2e6; color: #d32f2f; font-weight: 600;">50% ↓</td>
                </tr>
              </table>
              <p style="margin: 10px 0 30px; font-size: 12px; color: #6c757d; text-align: center;">
                ※ 모든 금액은 VAT 포함
              </p>

              <!-- 결제 안내 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8f9fa; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px; font-size: 15px; color: #333333; font-weight: 600;">💳 결제 방법</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #dee2e6;">
                          <p style="margin: 0; font-size: 14px; color: #495057;">
                            <strong style="color: #333;">계좌이체</strong><br>
                            <span style="color: #667eea; font-weight: 600;">우리은행 1005-302-954803</span><br>
                            <span style="font-size: 13px; color: #6c757d;">예금주: (주)폴라애드</span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 10px; font-size: 14px; color: #495057;">
                            <strong style="color: #333;">카드결제</strong><br>
                            <span style="font-size: 13px; color: #6c757d;">네이버예약에서 간편하게 카드결제 가능</span>
                          </p>
                          <a href="https://booking.naver.com/booking/5/bizes/1304508/items/6516411"
                             style="display: inline-block; padding: 10px 20px; background-color: #03c75a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 600;">
                            네이버예약 결제하기 →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 문의 안내 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #e3f2fd; border-radius: 8px;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #1565c0; font-weight: 600;">서비스 연장 문의</p>
                    <p style="margin: 0; font-size: 20px; color: #0d47a1; font-weight: 700;">📞 010-9897-9834</p>
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
                이 메일은 발신 전용입니다.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 이메일 발송 함수
async function sendEmail(to: string, name: string): Promise<{ success: boolean; messageId?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY가 설정되지 않았습니다.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "스타트패키지 <noreply@polaai.co.kr>",
      to: [to],
      subject: "자동화서비스 만료 안내",
      html: getEmailHTML(name),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "이메일 발송 실패");
  }

  const data = await response.json();
  return { success: true, messageId: data.id };
}

// 메인 실행
async function main() {
  console.log("========================================");
  console.log("자동화서비스 만료 안내 발송 시작");
  console.log("========================================\n");

  const results: { name: string; sms: string; email: string }[] = [];

  for (const recipient of recipients) {
    console.log(`\n📤 ${recipient.name}님 발송 중...`);

    let smsResult = "실패";
    let emailResult = "실패";

    // SMS 발송
    try {
      const smsContent = getSMSContent(recipient.name);
      await sendSMS(recipient.phone, smsContent);
      smsResult = "성공";
      console.log(`  ✅ SMS 발송 성공: ${recipient.phone}`);
    } catch (error: any) {
      console.log(`  ❌ SMS 발송 실패: ${error.message}`);
    }

    // 이메일 발송
    try {
      const emailRes = await sendEmail(recipient.email, recipient.name);
      emailResult = "성공";
      console.log(`  ✅ 이메일 발송 성공: ${recipient.email} (ID: ${emailRes.messageId})`);
    } catch (error: any) {
      console.log(`  ❌ 이메일 발송 실패: ${error.message}`);
    }

    results.push({ name: recipient.name, sms: smsResult, email: emailResult });

    // API 부하 방지를 위한 대기
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 결과 요약
  console.log("\n========================================");
  console.log("발송 결과 요약");
  console.log("========================================");

  console.log("\n| 이름 | SMS | 이메일 |");
  console.log("|------|-----|--------|");
  for (const r of results) {
    console.log(`| ${r.name} | ${r.sms} | ${r.email} |`);
  }

  const smsSuccess = results.filter((r) => r.sms === "성공").length;
  const emailSuccess = results.filter((r) => r.email === "성공").length;

  console.log(`\n📊 SMS: ${smsSuccess}/${results.length} 성공`);
  console.log(`📊 이메일: ${emailSuccess}/${results.length} 성공`);
}

main().catch(console.error);
