/**
 * 슬랙 채널 이름 생성 테스트
 */

function generateChannelName(
  cohortName: string,
  userName: string,
  brandName: string
): string {
  const sanitized = `${cohortName}_${userName}_${brandName}`
    .toLowerCase()
    .replace(/\s+/g, "_") // 공백을 언더스코어로
    .replace(/[^a-z0-9_\-가-힣ㄱ-ㅎㅏ-ㅣ]/g, "") // 영문, 숫자, 한글, 하이픈, 언더스코어만 허용
    .substring(0, 80); // 슬랙 채널 이름 최대 길이 제한

  return sanitized;
}

// 테스트
const cohortName = "19기 목";
const userName = "이재호";
const brandName = "폴라애드";

const channelName = generateChannelName(cohortName, userName, brandName);

console.log("=".repeat(50));
console.log("슬랙 채널 이름 생성 테스트");
console.log("=".repeat(50));
console.log(`입력값:`);
console.log(`  기수명: ${cohortName}`);
console.log(`  이름: ${userName}`);
console.log(`  브랜드명: ${brandName}`);
console.log();
console.log(`생성된 채널 이름: ${channelName}`);
console.log(`길이: ${channelName.length}자`);
console.log();

// 문자 분석
console.log("문자 분석:");
for (let i = 0; i < channelName.length; i++) {
  const char = channelName[i];
  const code = char.charCodeAt(0);
  console.log(`  [${i}] '${char}' (코드: ${code}, 16진수: 0x${code.toString(16)})`);
}
console.log();

// 슬랙 채널 이름 규칙 검증
console.log("슬랙 채널 이름 규칙 검증:");
const validPattern = /^[a-z0-9\-_]+$/;
const isValid = validPattern.test(channelName);
console.log(`  영문 소문자, 숫자, 하이픈, 언더스코어만 허용: ${isValid ? "✅ 통과" : "❌ 실패"}`);

if (!isValid) {
  console.log(`  문제 문자 발견:`);
  for (let i = 0; i < channelName.length; i++) {
    const char = channelName[i];
    if (!/[a-z0-9\-_]/.test(char)) {
      console.log(`    [${i}] '${char}' - 슬랙에서 허용하지 않는 문자`);
    }
  }
}

console.log("=".repeat(50));
