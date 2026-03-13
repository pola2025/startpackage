# NEXT SESSION: Deep Navy & Warm Gold — 프로덕션 검증

## 상태: 코드 완료 & 배포됨, 프로덕션 시각 검증 대기

## 이전 세션 완료 내역

### 커밋 1: `3bac77a` — 색상 리뉴얼 본체

- 84파일, blue/red → navy/gold 전면 교체
- tailwind.config.ts navy/gold 커스텀 컬러 추가
- globals.css CSS 변수 → gold 계열
- 접근성: 작은 텍스트 text-gold-500 → text-gold-600 (3곳)

### 커밋 2: `b6bb5f7` — 잔존 스타일 + 모바일 수정

- 잔존 blue 클래스 완전 제거 (kanban, contentTipCategories, use-auto-focus, test-upload, 테스트파일)
- page.tsx.backup 삭제
- 모바일 오버플로우 수정:
  - meta-ads: 가격 whitespace-nowrap 제거
  - communication: 날짜 줄바꿈 허용
  - submission-view: TabsList overflow-x-auto
  - startpackage: 프로세스 단계 nowrap 제거

### 로컬 검증 완료 항목

- [x] `/` 로그인 — 골드 그라디언트, 네이비 버튼
- [x] `/signup` 회원가입 — 네이비 아바타, 골드 스텝
- [x] `/admin/login` — 골드 그라디언트, 네이비 쉴드
- [x] `/startpackage` — 딥 네이비 배경
- [x] 모바일 360px — 오버플로우 없음
- [x] 빌드 성공
- [x] blue Tailwind 클래스 0건 잔존

## 다음 세션에서 할 일

### 1단계: 프로덕션 시각 검증 (필수)

인증 필요한 페이지를 프로덕션에서 확인:

- [ ] 유저 대시보드 (`/dashboard`) — 골드 프로그레스바, 네이비 CTA
- [ ] 자료제출 (`/dashboard/submission`) — 골드 탭, 네이비 저장 버튼
- [ ] 가이드 (`/dashboard/guides`) — 골드 탭 메뉴
- [ ] 워크플로우 (`/dashboard/workflows`) — 골드 뱃지
- [ ] 문의하기 (`/dashboard/communication`) — 날짜 줄바꿈 확인
- [ ] 관리자 대시보드 (`/admin`) — 네이비 로고, 골드 활성 탭
- [ ] 관리자 사용자관리 (`/admin/users`) — 테이블 색상
- [ ] 모바일 뷰포트 — 하단탭 골드, FAB 골드

### 2단계: 이메일 템플릿 확인

- `lib/notification/contentTipEmail.ts` 인라인 색상 변경됨
- 실제 이메일 발송 테스트 권장 (콘텐츠 팁 알림)

### 3단계: 칸반보드 검증

- `app/components/workflows/kanban-board.tsx` 시안중 상태 → gold-100 border-gold-300
- `kanban-column.tsx` 드래그 오버 → gold-50/gold-400
- 관리자 워크플로우 칸반뷰에서 확인

## 팔레트 참고

```
Navy 900: #0d1b2a   Gold 500: #c9a84c
Navy 800: #1b2838   Gold 600: #b8942f (접근성용)
Navy 700: #1f3044   Gold 400: #d4b86a
```

## 보존된 색상 (변경 안 함)

- green (성공/완료), red (에러/파괴적), yellow/amber (경고), gray (비활성)
- purple (시안/디자인 스레드), pink (인스타그램), orange (발주대기)
