# TDD: 흰색 기본 + 상태별 색상 — 구현 명세

> PRD: `docs/PRD_white-default-status-color.md`
> 와이어프레임: `docs/sidebar-wireframe-v2.html`

---

## Phase 0: 색상 토큰 정의 (CRITICAL — 최우선)

### 0-1. tailwind.config.ts에 terra/ok 추가

```ts
// tailwind.config.ts → theme.extend.colors
terra: {
  50:  '#faefed',
  100: '#ecd0cc',
  200: '#ddb1a9',
  300: '#cd9286',
  400: '#be7363',
  500: '#b85e52',
  600: '#8b3f35',
  700: '#6e3229',
  800: '#51251e',
  900: '#341812',
},
ok: {
  50:  '#f0fdf4',
  100: '#dcfce7',
  200: '#bbf7d0',
  300: '#86efac',
  400: '#4ade80',
  500: '#22c55e',
  600: '#16a34a',
  700: '#15803d',
  800: '#166534',
  900: '#14532d',
},
```

**검증**: 빌드 후 `app/dashboard/workflows/page.tsx`에서 상태 뱃지 색상 렌더링 확인

### 0-2. globals.css 디자인 토큰 추가 (선택)

기존 `--destructive`, `--success`, `--warning`과 별도로 terra/ok를 CSS 변수로 관리할지 결정.
현재는 Tailwind 클래스 직접 사용이므로 tailwind.config.ts만 수정해도 충분.

---

## Phase 1: 전역 컴포넌트 수정 (3개 파일)

### 1-1. components/ui/card.tsx

| 항목   | Before                      | After                    |
| ------ | --------------------------- | ------------------------ |
| border | `border-2 border-gray-200`  | `border border-gray-200` |
| shadow | `shadow-sm hover:shadow-md` | `shadow-sm` (hover 제거) |

```diff
- "rounded-xl border-2 border-gray-200 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200"
+ "rounded-xl border border-gray-200 bg-card text-card-foreground shadow-sm"
```

> **영향**: 전체 프로젝트의 `<Card>` 컴포넌트가 일괄 변경됨
> **주의**: 개별 카드에서 `border-2`를 오버라이드한 곳은 별도 확인 필요

### 1-2. components/ui/progress-bar.tsx

- `bg-gradient-to-*` → `bg-navy-700` (단색)
- 트랙 배경: `bg-gray-100`

### 1-3. components/ui/submission-progress.tsx

- terra/ok 클래스 → Phase 0에서 정의하므로 자동 해결
- 장식용 배경색 제거

---

## Phase 2: 사용자 대시보드 (~8개 파일)

### 2-1. app/dashboard/page.tsx (메인 대시보드)

**변경 목록:**

| 섹션                | Before                                                               | After                              |
| ------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| 환영 헤더 D-Day     | `bg-gradient-to-r from-gold-100 to-gold-50 border-2 border-gold-200` | `bg-white border border-gray-200`  |
| 내 정보 카드 아이콘 | `bg-gold-100`, `bg-green-100`, `bg-red-100` 등                       | `bg-gray-100` 통일                 |
| 제출률 카드         | `bg-gradient-to-br from-gold-50 to-white`                            | `bg-white border border-gray-200`  |
| 제출률 프로그레스   | `bg-gold-500`                                                        | `bg-navy-700`                      |
| 제출률 텍스트       | `text-gold-600 text-4xl`                                             | `text-navy-700 text-lg` (인라인화) |
| 마케팅 지원         | `bg-gradient-to-br from-navy-50 to-gold-50`                          | `bg-white border border-gray-200`  |
| 마케팅 항목 아이콘  | 각각 다른 bg-\*-100                                                  | `bg-gray-100` 통일                 |
| 알림 카드           | `bg-gradient-to-r from-gold-50`                                      | `bg-white border border-gray-200`  |
| border-2 전체       | `border-2`                                                           | `border`                           |

**상태색 유지:**

- 알림 urgent → `bg-terra-50` 배경 유지 (사용자 액션 필요)
- 알림 info/success → `bg-white` + 텍스트 색상만
- 워크플로우 시안확인 → `bg-terra-50` 유지

### 2-2. app/dashboard/workflows/page.tsx

**변경 목록:**

| 항목                 | Before              | After                             |
| -------------------- | ------------------- | --------------------------------- |
| 워크플로우 카드 배경 | 상태별 `bg-navy-50` | `bg-white border border-gray-200` |
| 시안확인 상태 카드   | `bg-terra-50`       | 유지 (상태색)                     |
| border-2             | `border-2`          | `border`                          |

### 2-3. app/dashboard/status/page.tsx

- `getStatusColor()` 함수의 terra/ok 클래스 → Phase 0에서 자동 해결
- 타임라인 아이템 배경 → `bg-white`
- 활성 상태만 배경색 유지

### 2-4. app/dashboard/submission/page.tsx & submission-mobile/page.tsx

- 제출 항목 카드 → `bg-white`
- 완료 항목 → `bg-white` + `text-ok-600` 체크 표시
- 미완료 항목 → `bg-white` + `text-terra-500` 경고 표시

### 2-5. app/dashboard/homepage/page.tsx

- 기존 스타일 확인 후 통일

### 2-6. app/dashboard/guides/page.tsx

- 이미 `bg-white border-2`로 비교적 깔끔
- `border-2` → `border`만 변경

### 2-7. app/dashboard/meta-ads/page.tsx

- 카드 배경 통일

### 2-8. app/dashboard/design-threads/page.tsx

- 카드 배경 통일

---

## Phase 3: 워크플로우 & 상태 컴포넌트 (~5개 파일)

### 3-1. components/ui/status-timeline.tsx

- 타임라인 노드 배경 → `bg-white`
- 활성/확인필요 노드만 상태색 유지
- terra/ok 클래스 → Phase 0에서 자동 해결

### 3-2. app/components/workflows/kanban-board.tsx

- STATUS_CONFIG 색상은 유지 (이미 표준 Tailwind 색상 사용)
- 컬럼 내부 카드 → `bg-white border border-gray-200`

### 3-3. app/components/workflows/kanban-column.tsx

- border-2 → border

### 3-4. app/admin/(dashboard)/workflows/workflows-client.tsx

- `getStatusBadge()` → terra/ok 자동 해결
- 카드 배경 → `bg-white`

### 3-5. app/admin/(dashboard)/workflows/workflow-actions.tsx

- 액션 버튼 주변 카드 → `bg-white`
- border-2 → border

---

## Phase 4: 제출 폼 위자드 (~4개 파일)

### 4-1. components/submission/wizard/wizard-container.tsx

- 외곽 그라데이션 → `bg-white border border-gray-200`
- border-2 → border

### 4-2. components/submission/wizard/wizard-step.tsx

- 스텝 카드 배경 → `bg-white`
- 완료 스텝 → `bg-white` + ok 텍스트
- 현재 스텝 → `bg-white border-navy-400` (강조는 border로)
- 미완료 → `bg-white border border-gray-200`

### 4-3. components/submission/wizard/style-card-selector.tsx

- 선택 카드 → `bg-white`, 선택됨 → `border-navy-700`
- border-2 → border (선택됨은 `border-2 border-navy-700` 유지 가능)

### 4-4. components/submission/wizard/color-palette-selector.tsx

- 동일 패턴 적용

---

## Phase 5: 관리자 페이지 (~8개 파일)

### 5-1. app/admin/(dashboard)/page.tsx (관리자 대시보드)

- 통계 카드 → `bg-white border border-gray-200`
- 그라데이션 제거

### 5-2~5-8. 나머지 관리자 페이지

| 파일                                | 주요 변경                       |
| ----------------------------------- | ------------------------------- |
| users/page.tsx + users-client.tsx   | border-2 → border, 카드 bg 통일 |
| cohorts/page.tsx + cohorts-list.tsx | border-2 → border               |
| alerts/page.tsx                     | 알림 카드 bg 통일               |
| notifications/page.tsx              | 카드 bg 통일                    |
| homepage/page.tsx                   | bg-blue-100 제거, 카드 통일     |
| design-threads/page.tsx             | 카드 bg 통일                    |

---

## Phase 6: 인증 & 랜딩 (~4개 파일)

### 6-1. app/page.tsx (랜딩/로그인)

- `bg-gradient-to-b from-gold-50/30` → `bg-white`
- `border-gold-200` → `border-gray-200`
- 로고 & 브랜드 색상은 유지

### 6-2. app/signup/page.tsx

- border-2 → border
- 그라데이션 제거

### 6-3. app/admin/login/page.tsx

- 그라데이션 → `bg-white`
- border-2 → border

### 6-4. app/admin/register/page.tsx

- 동일 패턴

---

## 실행 순서 & 의존성

```
Phase 0 (토큰) ──┐
                  ├→ Phase 1 (전역 컴포넌트) ──┐
                  │                             ├→ Phase 2 (대시보드)
                  │                             ├→ Phase 3 (워크플로우)
                  │                             ├→ Phase 4 (제출 폼)
                  │                             ├→ Phase 5 (관리자)
                  │                             └→ Phase 6 (인증/랜딩)
                  │
                  └→ [독립] 빌드 검증 가능
```

- **Phase 0 필수 선행**: terra/ok 없으면 Phase 2~5에서 상태 뱃지 작업 불가
- **Phase 1 선행 권장**: card.tsx 변경이 전역에 영향 → 이후 개별 카드 오버라이드 정리
- **Phase 2~6은 병렬 가능**: 페이지 간 의존성 없음

---

## 검증 체크리스트

### 각 Phase 완료 시

- [ ] `npm run build` 성공
- [ ] 타입 에러 없음
- [ ] 해당 페이지 브라우저 확인
- [ ] 상태 있는 항목에만 배경색이 있는지 확인
- [ ] 상태 없는 항목은 흰색 배경인지 확인

### 전체 완료 후

- [ ] 대시보드: 알림(urgent만 terra tint), 워크플로우(시안확인만 terra tint)
- [ ] 워크플로우 페이지: 모든 상태 뱃지 색상 정상 렌더링
- [ ] 제출 폼: 스텝 카드 흰색, 완료 표시 텍스트만
- [ ] 관리자: 카드 통일, border 두께 통일
- [ ] 모바일 반응형 깨지지 않음
- [ ] 사이드바/네비게이션 스타일 변경 없음
- [ ] 프로그레스 바 정상 동작

---

## 예상 작업량

| Phase    | 파일 수 | 난이도 | 예상 커밋     |
| -------- | ------- | ------ | ------------- |
| 0        | 1       | 낮음   | 1             |
| 1        | 3       | 낮음   | 1             |
| 2        | 8       | 중간   | 2~3           |
| 3        | 5       | 중간   | 1~2           |
| 4        | 4       | 낮음   | 1             |
| 5        | 8       | 중간   | 2~3           |
| 6        | 4       | 낮음   | 1             |
| **합계** | **~33** |        | **9~12 커밋** |

---

## 참고: 변경하지 않는 색상

| 요소               | 색상               | 이유                    |
| ------------------ | ------------------ | ----------------------- |
| 사이드바 배경      | `bg-navy-900`      | 구조적 레이아웃         |
| 버튼               | `bg-navy-800` 등   | 인터랙션 요소           |
| 프로그레스 바 채움 | `bg-navy-700`      | 데이터 시각화           |
| 아이콘 내부        | `bg-navy-800` 등   | 기능적 구분 (작은 영역) |
| 칸반 컬럼 헤더     | STATUS_CONFIG 색상 | 이미 잘 관리됨          |
| 폼 에러 배경       | `bg-red-50`        | 에러 상태 (유지)        |
| Pola 브랜드        | `#eaa90e`          | 로고/브랜드 고정        |
