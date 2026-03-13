# NEXT SESSION: 레이아웃 압축 + 시맨틱 컬러 구현

## 상태: 와이어프레임 완료, 시맨틱 컬러 제안 완료 → 승인 후 구현 대기

## 이번 세션 완료 내역

### 1. 와이어프레임 v2 수정 완료

- **파일**: `design-remodel-wireframe-v2.html`
- 헤더 가독성 개선: `bg-navy-900 text-white` → `bg-white text-navy-900`
- 서브 페이지 와이어프레임 11개 추가 (Before/After + 스펙 테이블):
  - submission, workflows, communication, design-threads, guides
  - meta-ads, announcements, content-tips, homepage, status, signup
- 레이아웃 폭 축소: `max-w-5xl` → `max-w-3xl`, `flex gap-6` → `grid grid-cols-2 gap-3`
- 와이어프레임 장식색 Navy/Gold 통일 (before-tag → navy-50, after-tag → gold-100)
- P1~P5 구현 우선순위 정리

### 2. 시맨틱 컬러 v2 제안 완료

- **파일**: `semantic-color-proposal.html`
- Gemini + Codex 분석 → v1(6색 혼합) → 사용자 피드백 → v2(동일계열 + Error only Red)
- **3축 시스템 (승인 대기)**:

| 축          | Role     | 50      | 100     | 500     | 600     |
| ----------- | -------- | ------- | ------- | ------- | ------- |
| Gold (warm) | Success  | #faf6eb | #f0e8cc | #c9a84c | #8a7328 |
| Gold (warm) | Social   | #fdf5ed | #f0dcc4 | #b8942f | #86671f |
| Navy (cool) | Warning  | #e8edf2 | #c5cfd9 | #5a7893 | #2d4d6b |
| Navy (cool) | Design   | #e8edf2 | #9fafc0 | #1f3044 | #0d1b2a |
| Navy (cool) | Inactive | #f4f6f8 | #e4e8ec | #8f9ba6 | #667180 |
| Red (유일)  | Error    | #faefed | #ecd0cc | #b85e52 | #8b3f35 |

## 다음 세션 작업 순서

### Step 1. 시맨틱 컬러 승인 확인

- `semantic-color-proposal.html` 사용자 피드백 확인
- 승인 시 → `tailwind.config.ts`에 success/warning/error/design/social/inactive 추가
- 기존 green/orange/red/purple/pink → 새 시맨틱 토큰으로 전역 치환

### Step 2. P1 — 전역 변경 (card.tsx + 전체 검색/치환)

1. `components/ui/card.tsx`: `border-2` → `border`, `p-6` → `p-3 pb-2`, `p-6 pt-0` → `p-3 pt-0`
2. 전역 `border-2 border-gray-200` → `border border-gray-100 shadow-sm`
3. 전역 `border-2 border-gold-200` → `border border-gold-100`
4. 그라디언트 카드 배경 → white 단색 + shadow-sm (인증 페이지 제외)

### Step 3. P2 — 대시보드 핵심 압축 (page.tsx)

- 환영 헤더 200px → 48px (인라인)
- D-Day 뱃지 → pill
- 내 정보 카드 제거
- 자료 제출률 180px → 44px (인라인 프로그레스바)
- 알림 3건 캡 + 더보기 토글
- 워크플로우 → 2열 그리드
- 마케팅 지원 → 아코디언 (72px 접힘)

### Step 4. P3 — 간격 축소 (전역)

- `space-y-6~8` → `space-y-3~4`
- `gap-4~6` → `gap-2~3`
- `mb-6` → `mb-3`

### Step 5. P4 — 서브 페이지 13개 압축

- submission: space-y-8→4, border 축소
- workflows: Alert 합치기/축소
- communication: 헤더 간격 72px→36px
- design-threads: 간격 축소
- guides: border 축소
- meta-ads: 간격 축소, 아코디언
- announcements: 네이버충전 카드 축소
- content-tips: 카테고리 간격 축소
- homepage: 내부 간격 축소
- status: gradient 제거, pb-20→8, text 축소, border 전부
- signup: 배경 로그인 통일, border 전부

### Step 6. P5 — 모바일 360px 최적화

- `text-wrap: balance` + `word-break: keep-all`
- 제출현황 그리드 단축명
- D-Day 뱃지 인라인 pill

### Step 7. 이메일 템플릿 3개 Navy/Gold 업데이트

- **파일**: `lib/email/resendClient.ts`
- `getDesignCompleteEmailHTML` (시안완료): `#667eea→#764ba2` → Navy/Gold
- `getAdminMessageEmailHTML` (관리자메시지): 동일
- `getSubmissionCompleteEmailHTML` (제작요청접수): 동일 + info box blue → Navy

## 참조 파일

| 파일                                 | 용도                                 |
| ------------------------------------ | ------------------------------------ |
| `design-remodel-wireframe-v2.html`   | 와이어프레임 (수정 완료)             |
| `semantic-color-proposal.html`       | 시맨틱 컬러 제안서 (승인 대기)       |
| `NEXT_SESSION_layout-compression.md` | 전체 분석 결과 (이번 세션 기반 문서) |
| `components/ui/card.tsx`             | P1 전역 패딩/border                  |
| `app/dashboard/page.tsx`             | P2 핵심 압축                         |
| `tailwind.config.ts`                 | 시맨틱 컬러 추가 대상                |
| `lib/email/resendClient.ts`          | 이메일 템플릿 3개                    |

## 미해결 (별도 세션)

- `NEXT_SESSION_gmail-slack-fix.md`: Gmail 슬랙 알림 미전송 문제 (별도 이슈)
