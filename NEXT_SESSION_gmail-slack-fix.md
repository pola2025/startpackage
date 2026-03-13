# Next Session: Gmail 슬랙 알림 미전송 문제

## 상태: 미완료 - 테스트 필요

## 완료된 작업

1. **Zod 스키마 수정** - `lib/schemas/submission.schema.ts`에 `GmailID`, `GmailPW` 추가
   - 이전: Zod에 Gmail 필드 누락 → 메인 폼 저장 시 데이터 strip됨
   - 수정 후: Gmail 데이터 DB 저장 정상 동작 확인

2. **슬랙 textFields 추가** - `app/api/submission/route.ts` 변경감지 목록에 Gmail 추가

3. **Gmail 명시적 슬랙 알림** - 변경감지와 별도로 Gmail 제출 시 강제 슬랙 알림 추가
   - 위치: `route.ts` 파일 필드 체크 바로 위
   - `validatedData.GmailID`가 있고 변경감지에 안 잡히면 별도 슬랙 메시지 발송

4. **디버깅 로그 추가** - Gmail/Slack 관련 console.log 추가

## 미해결 문제

- **슬랙 알림이 여전히 안 옴** (마지막 테스트 기준)
- git push 기반 배포 (`startpackage-ikduc1wna`) 완료 후 사용자 테스트 결과 미확인

## 핵심 발견

- `vercel --prod` CLI 배포가 git 자동 배포에 의해 덮어씌워짐
  - CLI 배포 런타임 로그: "waiting for new logs..." (요청 0건)
  - **반드시 git push로 배포해야 실제 프로덕션에 반영됨**

## 다음 세션에서 할 일

1. 이재호 계정으로 Gmail 저장 테스트 → 슬랙 알림 확인
2. 안 되면 Vercel 런타임 로그 확인 (디버깅 로그 추가됨):
   - `🔍 [Gmail Debug]` - validatedData vs existingSubmission 비교
   - `🔍 [Slack Check]` - slackChannelId 존재 여부, GmailID 비교
   - `📧 [Gmail]` - 명시적 제출 감지 여부
3. 가능한 원인 체크리스트:
   - [ ] 이재호 slackChannelId가 null인지 확인
   - [ ] existingSubmission.GmailID에 이미 같은 값이 있는지 (autosave)
   - [ ] 슬랙 API 에러가 .catch()에서 삼켜지는지
4. 디버깅 로그 확인 후 원인 파악되면 수정 및 디버깅 로그 제거

## 수정된 파일

- `lib/schemas/submission.schema.ts` - GmailID, GmailPW 추가
- `app/api/submission/route.ts` - Gmail 슬랙 알림 + 디버깅 로그

## 커밋

- `e04d361` fix: Gmail ID/PW 저장 안되는 버그 수정
- `1aded1e` fix: Gmail 슬랙 알림 강제 발송 + 디버깅 로그
