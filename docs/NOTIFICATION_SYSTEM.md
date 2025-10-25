# 알림 시스템 가이드

## 개요

스타트패키지 시스템은 **텔레그램**과 **슬랙**을 통해 자동 알림을 발송합니다.

### 알림 채널

- **텔레그램**: 사용자 알림 + 관리자 알림
- **슬랙**: 관리자 알림 + 진행 과정 기록 (개별 채널 생성)

---

## 📱 텔레그램 알림

### 자동 발송되는 알림

1. **신규 회원 가입**
   - 발송 대상: 관리자
   - 발송 시점: 회원가입 완료 시
   - 내용: 기수, 이름, 연락처, 이메일

2. **자료 제출 완료**
   - 발송 대상: 관리자
   - 발송 시점: 필수 항목 모두 제출 시
   - 내용: 기수명_이름_브랜드명 형식

3. **디자인 제작 요청**
   - 발송 대상: 관리자
   - 발송 시점: 인쇄물 발주 요청 시
   - 내용: 발주 항목 리스트

4. **시안 완료**
   - 발송 대상: 사용자
   - 발송 시점: 시안 업로드 시
   - 내용: 대시보드 확인 안내

5. **발주 완료**
   - 발송 대상: 사용자 + 관리자
   - 발송 시점: 인쇄소 발주 시
   - 내용: 예상 완료일

6. **제작 완료**
   - 발송 대상: 사용자
   - 발송 시점: 인쇄물 제작 완료 시
   - 내용: 송장번호 (있는 경우)

---

## 📊 슬랙 알림

### 채널 생성 규칙

자료 제출이 완료되면 자동으로 **전용 채널**이 생성됩니다.

**채널 이름 형식**: `기수명_이름_브랜드명`

예시:
- `1기_홍길동_길동카페`
- `19기목_김철수_철수치킨`

### 슬랙에 기록되는 내용

#### 1. 초기 메시지 (채널 생성 시)
```
🎉 새로운 제작 프로젝트 시작

기수: 19기 목
이름: 홍길동
브랜드명: 길동카페
연락처: 010-1234-5678
이메일: hong@example.com
상태: 자료 제출 완료 ✅
```

#### 2. 제작 정보
- 브랜드명, 업종, 주소
- 대표번호, 이메일
- 사업자등록증 (링크)
- 프로필사진 (링크)
- 홈페이지 컬러 컨셉
- 로고 스타일 등

#### 3. 진행 상황 로그
모든 단계별 진행 상황이 **일자와 함께** 기록됩니다:

- 상태 변경 (자료제출중 → 제작진행중 → 시안확인 → 발주요청 → 제작완료)
- 시안 업로드 (파일 링크 포함)
- 발주 완료 (예상 완료일)
- 제작 완료 (송장번호)

---

## ⚙️ 설정 방법

### 1. 텔레그램 봇 설정

#### 1-1. 봇 생성
1. 텔레그램에서 `@BotFather` 검색
2. `/newbot` 명령어 입력
3. 봇 이름과 username 설정
4. **BOT_TOKEN** 복사

#### 1-2. 채팅방 생성 및 ID 확인
1. 새로운 그룹 채팅방 생성 (또는 기존 채팅방 사용)
2. 생성한 봇을 채팅방에 초대
3. 채팅방 ID 확인:
   ```bash
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
4. `"chat":{"id":-1234567890}` 형식에서 ID 복사

#### 1-3. 환경변수 설정
`.env` 파일에 추가:
```bash
TELEGRAM_BOT_TOKEN="your_bot_token_here"
TELEGRAM_CHAT_ID="-1234567890"
```

---

### 2. 슬랙 봇 설정

#### 2-1. 슬랙 앱 생성
1. https://api.slack.com/apps 접속
2. "Create New App" 클릭
3. "From scratch" 선택
4. 앱 이름과 워크스페이스 선택

#### 2-2. 봇 권한 설정
"OAuth & Permissions" 메뉴에서 다음 권한 추가:

**Bot Token Scopes**:
- `channels:read` - 채널 목록 조회
- `channels:manage` - 채널 생성/수정
- `chat:write` - 메시지 전송
- `chat:write.public` - 공개 채널에 메시지 전송

#### 2-3. 봇 설치 및 토큰 확인
1. "Install to Workspace" 클릭
2. 권한 승인
3. **Bot User OAuth Token** 복사 (`xoxb-`로 시작)

#### 2-4. 환경변수 설정
`.env` 파일에 추가:
```bash
SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
SLACK_TEAM_ID="T01234ABCDE"  # (옵션)
```

---

## 🧪 테스트 방법

### 텔레그램 테스트
```typescript
import { notifyAdmin } from "@/lib/notification/telegramClient";

await notifyAdmin({
  title: "테스트 알림",
  message: "텔레그램 연동 테스트입니다.",
  details: {
    "테스트 항목": "정상 작동 확인",
  },
});
```

### 슬랙 테스트
```typescript
import { createSlackChannel } from "@/lib/notification/slackClient";

const channelId = await createSlackChannel({
  cohortName: "테스트기",
  userName: "홍길동",
  brandName: "테스트카페",
  userEmail: "test@example.com",
  userPhone: "010-1234-5678",
});

console.log("생성된 채널 ID:", channelId);
```

---

## 📁 파일 구조

```
lib/notification/
├── telegramClient.ts      # 텔레그램 봇 클라이언트
├── slackClient.ts         # 슬랙 API 클라이언트
└── notificationService.ts # 통합 알림 서비스
```

### 주요 함수

#### telegramClient.ts
- `notifyAdmin()` - 관리자 알림
- `notifyUser()` - 사용자 알림
- `notifySubmissionComplete()` - 자료 제출 완료
- `notifyOrderRequest()` - 발주 요청
- `notifyDesignComplete()` - 시안 완료
- `notifyProductionComplete()` - 제작 완료

#### slackClient.ts
- `createSlackChannel()` - 채널 생성
- `postMessage()` - 메시지 전송
- `logProgress()` - 진행 상황 로그
- `pushSubmissionData()` - 제작 정보 푸시
- `logStateChange()` - 상태 변경 로그
- `logDesignUpload()` - 시안 업로드 로그
- `logOrder()` - 발주 로그
- `logProductionComplete()` - 제작 완료 로그

#### notificationService.ts
- `handleSubmissionComplete()` - 자료 제출 완료 처리
- `handleStateChange()` - 워크플로우 상태 변경
- `handleDesignUpload()` - 시안 업로드
- `handleOrderRequest()` - 발주 요청
- `handleProductionComplete()` - 제작 완료
- `logProgress()` - 진행 상황 로그

---

## 🔧 트러블슈팅

### 텔레그램 알림이 안 올 때
1. `.env` 파일에 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_CHAT_ID` 확인
2. 봇이 채팅방에 초대되어 있는지 확인
3. 채팅방 ID가 정확한지 확인 (음수 포함)
4. 서버 로그 확인: `console.log`로 에러 메시지 확인

### 슬랙 채널이 생성되지 않을 때
1. `.env` 파일에 `SLACK_BOT_TOKEN` 확인
2. 봇 권한 확인 (`channels:manage`, `chat:write` 등)
3. 워크스페이스에 봇이 설치되어 있는지 확인
4. 채널 이름 규칙 확인 (소문자, 숫자, 언더스코어만 허용)

### 슬랙 메시지가 전송되지 않을 때
1. DB에 `slackChannelId`가 저장되어 있는지 확인
2. 채널이 실제로 존재하는지 슬랙에서 확인
3. 봇이 해당 채널에 접근 권한이 있는지 확인

---

## 📌 주의사항

1. **환경변수 필수**: 텔레그램과 슬랙 토큰이 없으면 알림이 발송되지 않습니다.
2. **알림 실패는 무시**: 알림 발송 실패 시에도 주요 로직은 계속 진행됩니다.
3. **채널 이름 제한**: 슬랙 채널 이름은 최대 80자, 소문자/숫자/언더스코어만 허용
4. **비동기 처리**: 알림은 백그라운드에서 처리되므로 사용자 경험에 영향 없음

---

## 🚀 향후 개선 사항

- [ ] 사용자별 텔레그램 채팅 ID 저장 (개인 알림)
- [ ] 슬랙 스레드 기능 활용 (메시지 그룹화)
- [ ] 알림 발송 이력 DB 저장
- [ ] 알림 재전송 기능
- [ ] 이메일 알림 통합
