# NEXT SESSION: 와이어프레임 v5 — 완료 계층 + SVG 아이콘 + 시맨틱 폰트

## 상태: 제안 HTML 검토 중 → 사용자 선택 후 구현

## 이번 세션 완료 내역

### 1. tailwind.config.ts — ok/terra 팔레트 추가

- ok: `{ 50, 100, 500, 600, 700 }`
- terra: `{ 50, 100, 500, 600 }`
- gold 팔레트는 유지 (삭제는 다음 단계)

### 2. 시맨틱 폰트 컬러 프로덕션 코드 반영 (12파일)

| 파일                                                      | 변경                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `app/dashboard/workflows/page.tsx`                        | 유저 워크플로우 statusMap → ok/terra/navy                        |
| `app/admin/(dashboard)/workflows/workflows-client.tsx`    | 관리자 워크플로우 statusMap → ok/terra/navy                      |
| `app/dashboard/status/page.tsx`                           | getStatusColor → ok/terra/navy                                   |
| `app/dashboard/page.tsx`                                  | 알림 colors/badgeColors + 워크플로우 statusColor + 자료제출 카드 |
| `components/ui/submission-progress.tsx`                   | 보완필요→terra, 완료→ok                                          |
| `components/submission/my-submission-status.tsx`          | WORKFLOW_STATUS_MAP + 아코디언 아이콘                            |
| `components/ui/status-timeline.tsx`                       | completed/warning/pending → ok/terra/navy                        |
| `app/admin/(dashboard)/workflows/workflow-progress.tsx`   | 긴급도 뱃지 → terra                                              |
| `app/admin/(dashboard)/workflows/urgent-alert-banner.tsx` | 긴급 알림 배너 → terra                                           |
| `app/admin/(dashboard)/workflows/urgent-alert-modal.tsx`  | 긴급 알림 모달 → terra                                           |
| `app/components/workflows/kanban-card.tsx`                | 칸반 긴급 뱃지 → terra                                           |

### 3. 와이어프레임 v4 CDN 수정

- `cdn.tailwindcss.com` → `cdn.tailwindcss.com/3.4.17` (v4 호환 문제)
- CSS 폴백 추가: ok/terra/navy 커스텀 컬러를 `<style>` 에 직접 정의

### 4. 완료 계층 표현 제안서 생성

- **파일**: `design-proposal-completion-hierarchy.html`
- 3가지 옵션 제안 (사용자 선택 대기):
  - **A**: 체크 오버레이 배지 (추천) — 아이콘 우하단 녹색✓/붉은! 배지
  - **B**: 좌측 Accent Bar — 4px 세로 바로 완료/미완 구분
  - **C**: 투명도 + 프로그레스 링 — 완료 opacity 낮춰서 미완에 시선 집중

## 다음 세션 작업

### 0. 사용자 선택 확인 (우선)

- `design-proposal-completion-hierarchy.html` 열어서 A/B/C 중 선택 확인
- 선택 결과에 따라 와이어프레임 v5 갱신

### 1. 와이어프레임 v5 갱신 적용

- 선택된 완료 계층 패턴을 와이어프레임 전체에 반영
- **이모지 → SVG 아이콘 전환** (모든 섹션)
- 카드 배경: navy-50 → gray-50 변경
- 시맨틱 폰트 컬러 일관 적용 확인

### 2. SVG 아이콘 매핑 (확정)

| 용도         | Lucide 아이콘 |
| ------------ | ------------- |
| 사업자등록증 | FileText      |
| 프로필사진   | User          |
| 브랜드명     | Tag           |
| 명함         | CreditCard    |
| 업종         | Briefcase     |
| 주소         | MapPin        |
| 홈페이지     | Globe         |

### 3. 프로덕션 코드 적용 (선택 후)

- 선택된 패턴을 `app/dashboard/page.tsx` 자료 제출 현황 섹션에 구현
- 이모지 아이콘 → Lucide SVG 아이콘 교체
- 카드 배경 gray-50 통일

### 4. 핸드오프 Step 2~8 (미착수)

- Step 2: Gold → Navy 전역 치환
- Step 3: 시맨틱 컬러 전역 치환 (green/red/orange → ok/terra)
- Step 4: card.tsx 패딩/border 경량화
- Step 5: 대시보드 핵심 압축
- Step 6: 전역 간격 축소
- Step 7: 서브 페이지 압축
- Step 8: 이메일 템플릿 Navy 업데이트

## 시맨틱 폰트 컬러 규칙 (확정)

| 상태               | 폰트 토큰  | 헥스            | 의미       |
| ------------------ | ---------- | --------------- | ---------- |
| 완료/확정/발주완료 | ok-600~700 | #16a34a~#15803d | 안심, 완료 |
| 주의/대기/필요     | terra-500  | #b85e52         | 행동 필요  |
| 긴급/수정요청      | terra-600  | #8b3f35         | 즉시 행동  |
| 진행중/제작중      | navy-600   | #2d4d6b         | 중립       |
| 비활성/종료        | navy-300   | #7990a7         | 무시 가능  |

## 사용자 요구사항 정리

- **이모지 금지**: 모든 아이콘은 SVG 기반(Lucide)만 사용
- **카드 배경**: gray 계열 통일 (navy-50 → gray-50)
- **완료 계층**: 단순 텍스트 외에 시각적 계층(배지/바/투명도 등) 필요
- **폰트 컬러**: 완료=녹색, 주의/필요=붉은색, 진행=네이비 필수

## 참조 파일

| 파일                                              | 용도                              |
| ------------------------------------------------- | --------------------------------- |
| `design-proposal-completion-hierarchy.html`       | 완료 계층 3가지 제안 (선택 대기)  |
| `design-remodel-wireframe-v4-dual-layer.html`     | 현재 와이어프레임 (CDN 수정 완료) |
| `NEXT_SESSION_dual-layer-color-implementation.md` | 이전 핸드오프 (Step 1~8 전체)     |
| `tailwind.config.ts`                              | ok/terra 팔레트 추가 완료         |

## 빌드 상태

- ✅ `next build` 성공 (타입/컴파일 에러 없음)
- ⚠️ 기존 lint 경고 존재 (useEffect deps 등, 이번 작업과 무관)
