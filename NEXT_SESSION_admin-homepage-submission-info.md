# 세션 핸드오프: 관리자 홈페이지 제출정보 표시

## 완료 작업

- 관리자 워크플로우 > 홈페이지 > 제출정보에서 아임웹 정보 제거, 도메인/Gmail 정보로 교체
- 3개 파일 수정:
  1. `app/admin/(dashboard)/workflows/submission-view-button.tsx` - 홈페이지 탭: 아임웹 → 도메인+Gmail
  2. `app/admin/(dashboard)/users/user-actions.tsx` - 사용자 관리 제출정보: 아임웹 → 도메인+Gmail
  3. `app/admin/(dashboard)/homepage/page.tsx` - 최근접수 알림, 테이블 컬럼 추가, 아임웹/카드 섹션 제거
  4. `app/api/admin/homepage/route.ts` - API에서 아임웹 필드 제거, GmailID/PW 추가

## 핵심 결정사항

- 아임웹은 더 이상 사용하지 않음 → 관련 UI 전부 제거
- 카드/신분증 정보는 슬랙에서만 확인 (관리자 페이지에 표시하지 않음)
- ID/PW는 마스킹 없이 그대로 표시

## 커밋

- `b46d3e6` feat: 관리자 홈페이지 페이지에 접수 정보 표시 + 아임웹/카드 섹션 제거
- `1b42ddf` fix: 워크플로우 제출정보 홈페이지 탭 - 아임웹 → 도메인/Gmail 정보로 교체
- `de3e745` fix: 사용자 관리 제출정보에서도 아임웹 → 도메인/Gmail 정보로 교체

## 주의사항

- 제출정보 보기 UI가 **3곳**에 있음: workflows/submission-view-button.tsx, users/user-actions.tsx, homepage/page.tsx
- 변경할 때 3곳 모두 확인 필수
