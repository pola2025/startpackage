/**
 * 자동화서비스 만료 안내 - SMS(LMS) 발송 스크립트
 * 실행: npx tsx scripts/send-expiry-sms-only.ts
 */

import { config } from "dotenv";
config({ path: ".env" });

import { getSMSClient } from "../lib/sms/ncpSensClient";

// 발송 대상자 목록
const recipients = [
  { name: "김지완", phone: "01051814465" },
  { name: "김민수", phone: "01079257958" },
  { name: "정승화", phone: "01052228176" },
  { name: "이빈", phone: "01086630131" },
  { name: "유희강", phone: "01031931001" },
  { name: "안정현", phone: "01052447919" },
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

// 메인 실행
async function main() {
  console.log("========================================");
  console.log("자동화서비스 만료 안내 - SMS(LMS) 발송");
  console.log("========================================\n");

  const client = getSMSClient();
  const results: { name: string; phone: string; result: string }[] = [];

  for (const recipient of recipients) {
    console.log(`\n📤 ${recipient.name}님 발송 중...`);

    try {
      const content = getSMSContent(recipient.name);
      // LMS로 명시적 발송
      await client.sendSMS(recipient.phone, content, "LMS");
      results.push({ name: recipient.name, phone: recipient.phone, result: "성공" });
      console.log(`  ✅ LMS 발송 성공: ${recipient.phone}`);
    } catch (error: any) {
      results.push({ name: recipient.name, phone: recipient.phone, result: "실패" });
      console.log(`  ❌ LMS 발송 실패: ${error.message}`);
    }

    // API 부하 방지를 위한 대기
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 결과 요약
  console.log("\n========================================");
  console.log("발송 결과 요약");
  console.log("========================================");

  console.log("\n| 이름 | 연락처 | 결과 |");
  console.log("|------|--------|------|");
  for (const r of results) {
    console.log(`| ${r.name} | ${r.phone} | ${r.result} |`);
  }

  const success = results.filter((r) => r.result === "성공").length;
  console.log(`\n📊 SMS(LMS): ${success}/${results.length} 성공`);
}

main().catch(console.error);
