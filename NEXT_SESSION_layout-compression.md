# NEXT SESSION: 전체 페이지 레이아웃 압축 구현

## 🔥 우선 작업: 사이드바 메뉴 재구성

기존 사이드바 메뉴를 접이식(collapsible) 그룹 구조로 정리.

### 새 메뉴 구조

```
대시보드                    → /dashboard
제작진행 (접이식, 기본 열림)
  ├ 자료 제출               → /dashboard/submission
  ├ 홈페이지 제작요청        → /dashboard/homepage
  └ 제작 현황               → /dashboard/workflows
문의하기                    → /dashboard/communication
가이드 (접이식, 기본 접힘)
  ├ 참고가이드              → /dashboard/guides
  ├ Meta 광고               → /dashboard/meta-ads
  ├ 시안 확인               → /dashboard/design-threads
  ├ 마케팅 소식             → /dashboard/announcements
  └ 콘텐츠 제작 Tip         → /dashboard/content-tips
```

### 요구사항

1. **제작진행**: collapsible, 기본 **열림**
2. **가이드**: collapsible, 기본 **접힘**
3. 뱃지: 제작 현황, 문의하기에 미확인 건수 표시
4. 하단: 로그인 정보 + 로그아웃
5. 모바일: 햄버거 → 드로어 슬라이드
6. 색상: 기존 Navy/Gold 유지
7. 와이어프레임 참고: `F:\polasales\docs\sidebar-wireframe.html` (다크테마, Desktop/Mobile 토글)

### 작업 파일

- `app/dashboard/layout.tsx` — 사이드바/하단탭 컴포넌트
- `components/` — 사이드바 관련 컴포넌트

---

## 목표

대시보드 중심 전체 페이지 세로 압축 (-56%) + 스타일 통일. 컬러는 현재 Navy/Gold 유지.

## 와이어프레임

- 파일: `F:\startpackage\design-remodel-wireframe-v2.html`
- **주의: 헤더 영역 텍스트 가독성 수정 필요** (흰색 텍스트가 눈에 안 보임 → 배경 밝게 변경하거나 텍스트 색상 조정)
- 와이어프레임에 전체 페이지 추가 필요 (현재 대시보드만 있음 → 아래 분석 기반으로 모든 페이지 와이어프레임 추가)

## 전체 페이지 분석 결과

### 전역 문제 (card.tsx)

| 항목             | 현재                       | 목표                               |
| ---------------- | -------------------------- | ---------------------------------- |
| Card 기본 border | `border-2 border-gray-200` | `border border-gray-100 shadow-sm` |
| CardHeader 패딩  | `p-6`                      | `p-3 pb-2`                         |
| CardContent 패딩 | `p-6 pt-0`                 | `p-3 pt-0`                         |

### 대시보드 (`/dashboard`) — 핵심 타겟

| 섹션              | Before                                       | After                                             | 절감      |
| ----------------- | -------------------------------------------- | ------------------------------------------------- | --------- |
| 환영 헤더         | 200px (text-3xl~5xl + 서브타이틀)            | 48px (`이름님` + `기수 · 스타트패키지` 인라인)    | -152px    |
| D-Day 뱃지        | 큰 카드 (px-6 py-4, w-12 h-12 아이콘)        | pill 뱃지 (`D-14 마감` / `D-34 마케팅`) 헤더 우측 | 카드→뱃지 |
| 내 정보 카드      | 별도 Card (border-2, grid gap-3~4)           | **완전 제거** → 기수 정보를 환영 헤더에 합체      | -전체     |
| 자료 제출률       | 180px (그라디언트 카드, p-6~8, text-4xl~5xl) | 44px (인라인 프로그레스 바 1줄)                   | -136px    |
| 알림 리스트       | 무제한 (space-y-1.5~2)                       | 3건 캡 + `+ N건 더보기` 토글                      | 가변      |
| 알림 뱃지         | outline (bg-red-100)                         | filled (bg-red-500 text-white)                    | —         |
| 워크플로우        | 세로 5행 (space-y-2~3, p-3~4)                | 2열 그리드 (grid-cols-2 gap-1.5)                  | ~50%      |
| 워크플로우 아이템 | 멀티라인 (날짜, 택배정보 등)                 | 단일 줄: 컬러 도트(w-2) + 이름 + 상태 인라인      | 압축      |
| 마케팅 지원       | 500px (3개 서브카드 + 연장 UI)               | 72px 아코디언 (제목 + D-day + 태그 한 줄)         | -428px    |
| 최외곽 간격       | `space-y-6 sm:space-y-8`                     | `space-y-3 sm:space-y-4`                          | 전역      |

### 자료제출 (`/dashboard/submission`)

| 문제            | 현재                                           | 목표                           |
| --------------- | ---------------------------------------------- | ------------------------------ |
| 최외곽 간격     | `space-y-8`                                    | `space-y-4`                    |
| 마감경고 border | `border-2 border-yellow-300`                   | `border border-yellow-200`     |
| 내접수현황 토글 | `border-2 border-gold-200`, `bg-gradient-to-r` | `border border-gold-100`, 단색 |
| TabsList        | `border-2 border-gray-200`                     | `border border-gray-100`       |
| 폼 내부         | `space-y-6` → `space-y-4`                      | 간격 축소                      |

### 제작현황 (`/dashboard/workflows`)

| 문제            | 현재                                        | 목표                                |
| --------------- | ------------------------------------------- | ----------------------------------- |
| Alert 2개       | `border-2`, `bg-gradient-to-r`, 합산 ~400px | border-1, 단색, 1개로 합치거나 축소 |
| 워크플로우 카드 | `md:border-2`, `space-y-3~4`                | `border`, 간격 축소                 |
| 전체 간격       | `space-y-6`                                 | `space-y-3`                         |

### 커뮤니케이션 (`/dashboard/communication`)

| 문제          | 현재                             | 목표                 |
| ------------- | -------------------------------- | -------------------- |
| 헤더 간격     | `mb-6` + `mt-6 mb-6` (72px 누적) | `mb-3` + `mt-3 mb-3` |
| 스레드 아이템 | `border-2`                       | `border`             |
| 메시지 간격   | `space-y-4`                      | `space-y-2`          |

### 시안확인 (`/dashboard/design-threads`)

| 문제          | 현재             | 목표             |
| ------------- | ---------------- | ---------------- |
| 헤더          | `space-y-6 mb-6` | `space-y-3 mb-3` |
| 스레드 아이템 | `border-2`       | `border`         |

### 가이드 (`/dashboard/guides`)

| 문제         | 현재                            | 목표                     |
| ------------ | ------------------------------- | ------------------------ |
| 탭 Card들    | `border-2 border-gray-200` 다수 | `border`                 |
| SMS 발신번호 | `border-2`                      | `border`                 |
| 팁 박스      | `border-2 border-gold-200`      | `border border-gold-100` |

### Meta 광고 (`/dashboard/meta-ads`)

| 문제               | 현재                              | 목표                     |
| ------------------ | --------------------------------- | ------------------------ |
| 5개 Card 수직 나열 | `space-y-4~6`, 각각 `space-y-3~4` | 간격 축소, 일부 아코디언 |
| 하단               | `pb-4 md:pb-0`                    | 정리                     |

### 마케팅 소식 (`/dashboard/announcements`)

| 문제            | 현재                                                   | 목표                 |
| --------------- | ------------------------------------------------------ | -------------------- |
| 네이버충전 카드 | `border-2 border-gold-300`, `bg-gradient-to-r`, ~200px | `border`, 단색, 축소 |
| 상세뷰          | `space-y-6`                                            | `space-y-3`          |
| 그리드 갭       | `gap-4 md:gap-6`                                       | `gap-2 md:gap-3`     |

### 콘텐츠 제작 Tip (`/dashboard/content-tips`)

| 문제          | 현재                                  | 목표                     |
| ------------- | ------------------------------------- | ------------------------ |
| 카테고리 간격 | `space-y-8 md:space-y-12` (매우 넓음) | `space-y-4 md:space-y-6` |
| 카테고리 섹션 | `border-2`                            | `border`                 |
| 이메일 배너   | `bg-gradient-to-r`                    | 단색                     |

### 홈페이지 제작요청 (`/dashboard/homepage`)

| 문제          | 현재             | 목표        |
| ------------- | ---------------- | ----------- |
| 내부 간격     | `space-y-6` 다수 | `space-y-3` |
| 도메인/스타일 | `border-2`       | `border`    |

### 상태 페이지 (`/dashboard/status`)

| 문제              | 현재                                     | 목표                              |
| ----------------- | ---------------------------------------- | --------------------------------- |
| **페이지 전체**   | `bg-gradient-to-b from-gold-50 to-white` | `bg-white` 또는 `bg-gray-50` 단색 |
| 하단 여백         | `pb-20`                                  | `pb-8`                            |
| 헤더 텍스트       | `text-3xl sm:text-4xl`                   | `text-lg`                         |
| **border-2 과다** | 모든 Card, Badge, 피드백, 택배, 안내 등  | 전부 `border`                     |
| 내부 간격         | `space-y-6` 반복                         | `space-y-3`                       |

### 회원가입 (`/signup`)

| 문제              | 현재                                     | 목표                            |
| ----------------- | ---------------------------------------- | ------------------------------- |
| 배경 불일치       | `bg-gray-50` 단색 (로그인/관리자와 다름) | 로그인과 동일한 gold 그라디언트 |
| **border-2 과다** | Card, 모든 Input, Select, 에러박스       | 전부 `border`                   |
| 확인 박스         | `border-2 border-gold-300`               | `border border-gold-200`        |

### 로그인 / 관리자 로그인 — 변경 없음

이미 컴팩트하고 Navy/Gold 적용 완료. 그라디언트 배경은 인증 페이지 특성상 유지.

### 스타트패키지 (`/startpackage`) — 변경 없음

랜딩 페이지 특성상 의도적으로 길게 구성. 독자적 다크 스타일(slate) 유지.

## 구현 우선순위

### P1. 전역 변경 (card.tsx + 전체 검색/치환)

1. card.tsx: `border-2 → border`, `p-6 → p-3 pb-2` / `p-6 pt-0 → p-3 pt-0`
2. 전역 `border-2 border-gray-200` → `border border-gray-100 shadow-sm`
3. 전역 `border-2 border-gold-200` → `border border-gold-100`
4. 그라디언트 카드 배경 → white 단색 + shadow-sm (인증 페이지 제외)

### P2. 대시보드 핵심 압축 (page.tsx)

5. 환영 헤더 200px → 48px (인라인)
6. D-Day 뱃지 → pill
7. 내 정보 카드 제거
8. 자료 제출률 180px → 44px (인라인 프로그레스바)
9. 알림 3건 캡 + 더보기 토글
10. 워크플로우 → 2열 그리드
11. 마케팅 지원 → 아코디언 (72px 접힘)

### P3. 간격 축소 (전역)

12. `space-y-6~8` → `space-y-3~4`
13. `gap-4~6` → `gap-2~3`
14. `mb-6` → `mb-3`

### P4. 서브 페이지 압축

15. submission: space-y-8 → 4, border-2 제거
16. workflows: Alert 합치기/축소, border-2 제거
17. communication: 헤더 간격 축소
18. design-threads: 헤더 간격 축소
19. content-tips: 카테고리 간격 축소
20. announcements: 네이버충전 카드 축소
21. status: gradient 제거, pb-20 → pb-8, 텍스트 축소, border-2 전부 제거
22. signup: 배경 통일, border-2 제거
23. meta-ads: 간격 축소

### P5. 모바일 360px 최적화

24. `text-wrap: balance` + `word-break: keep-all`
25. 제출현황 그리드 `grid-cols-4` (단축명)
26. D-Day 뱃지: 인라인 pill

## 와이어프레임 수정 필요 사항

1. **헤더 가독성 수정**: navy-900 배경 + 흰 텍스트 → 밝은 배경 + 어두운 텍스트로 변경
2. **전체 페이지 와이어프레임 추가**: 대시보드만 있음 → submission, workflows, communication, status 등 모든 페이지 압축 와이어프레임 추가
3. 각 페이지 Before/After 비교 명시

## 참조 파일

| 파일                                   | 용도                                |
| -------------------------------------- | ----------------------------------- |
| `components/ui/card.tsx`               | P1 전역 패딩/border 변경            |
| `app/dashboard/page.tsx`               | P2 핵심 압축 (1,070줄)              |
| `app/dashboard/layout.tsx`             | 사이드바/하단탭 (간격 조정)         |
| `app/dashboard/submission/page.tsx`    | P4 제출 페이지                      |
| `app/dashboard/workflows/page.tsx`     | P4 워크플로우                       |
| `app/dashboard/communication/page.tsx` | P4 커뮤니케이션                     |
| `app/dashboard/status/page.tsx`        | P4 상태 페이지 (가장 border-2 과다) |
| `app/signup/page.tsx`                  | P4 회원가입 (스타일 불일치)         |
| `tailwind.config.ts`                   | Navy/Gold 팔레트 (유지)             |

## 이전 세션 이력

- `3bac77a`: Navy/Gold 컬러 리뉴얼 (84파일)
- `b6bb5f7`: 잔존 blue 제거 + 모바일 오버플로우 수정
- 프로덕션 시각 검증 완료: 로그인/회원가입/관리자 로그인/대시보드/자료제출/가이드/워크플로우/문의하기/모바일 360px
- 이메일 발송 테스트 완료 (contentTipEmail.ts 골드 색상 확인)
- **나머지 3개 이메일 템플릿** (시안완료/관리자메시지/제작요청접수): 아직 구 blue/purple (`#667eea → #764ba2`), Navy/Gold 업데이트 필요

## 컬러 정책

- Navy/Gold 팔레트 유지 (tailwind.config.ts에 정의됨)
- 그라디언트 배경: 인증 페이지(로그인/관리자 로그인)만 허용, 나머지는 white 단색 + shadow
- border: 1px만 사용 (border-2 전면 금지)
- 시맨틱 색상 유지: green/red/orange/purple/pink/gray
