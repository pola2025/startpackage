# NEXT SESSION: 이중 레이어 컬러 시스템 구현

## 상태: 와이어프레임 v4 승인 완료 → 코드 구현 대기

## 이번 세션 완료 내역

### 1. 시맨틱 컬러 v2 (3축) → 폐기

- Gold축 + Navy축 + Red축 제안 → 사용자 피드백: "골드 걷어내고 2축으로"

### 2. 와이어프레임 v3 (2축 Navy+Red) → 중간 단계

- **파일**: `design-remodel-wireframe-v3-2axis.html`
- Navy 명도만으로 5개 역할(Success/Design/Warning/Social/Inactive) 구분
- Error만 Terra Cotta(Red)로 분리

### 3. 와이어프레임 v4 (이중 레이어) → 최종 승인

- **파일**: `design-remodel-wireframe-v4-dual-layer.html`
- 사용자 피드백: "완료는 녹색 폰트, 주의/필요는 붉은 폰트, 카드 배경은 Navy 2축"
- **이중 레이어 시스템 확정**

## 이중 레이어 시스템 스펙

### Layer 1 — 배경 (Navy 명도 = 구조적 위계)

카드 bg, 보더, 도트 색상. 어두울수록 완료에 가까움.

| 요소           | Navy 레벨          | 용도                            |
| -------------- | ------------------ | ------------------------------- |
| 도트/아이콘 bg | 900 `#0d1b2a`      | 최종확정                        |
| 도트/아이콘 bg | 800 `#1b2838`      | 발주완료                        |
| 도트           | 700 `#1f3044`      | 제작중                          |
| 도트           | 400 `#5a7893`      | 발주대기                        |
| 도트           | 200 `#9fafc0`      | 종료/비활성                     |
| 카드 bg        | 50 `#e8edf2`       | 모든 카드 통일                  |
| 긴급 카드 bg   | terra-50 `#faefed` | 수정요청/시안확인 (유일한 예외) |

### Layer 2 — 폰트 (시맨틱 = 행동 신호)

상태 텍스트와 이모지에만 적용.

| 폰트 색상   | 토큰      | 헥스      | 의미            | 예시                     |
| ----------- | --------- | --------- | --------------- | ------------------------ |
| 녹색        | ok-600    | `#16a34a` | 완료, 안심      | ✓ 완료, ✓ 확정, ✓ 발주   |
| 붉은색      | terra-500 | `#b85e52` | 주의, 행동 필요 | ⚠ 필요, ⚠ 대기, 시안확인 |
| 진한 붉은색 | terra-600 | `#8b3f35` | 긴급            | 수정요청, 시안확인 필수  |
| 네이비      | navy-600  | `#2d4d6b` | 진행중 (중립)   | 제작중                   |
| 연한 네이비 | navy-300  | `#7990a7` | 비활성          | 종료                     |

### 이중 강조 규칙

- 배경(terra-50) + 폰트(terra-600) 동시 적용 = **수정요청/시안확인** 전용
- 나머지는 배경 navy-50 통일, 폰트만 시맨틱

### 아이템명 규칙

- 카드 아이템명(로고, 명함 등)은 항상 `navy-900` (종료 시 `navy-300`)
- 상태 텍스트만 시맨틱 폰트 적용

## 다음 세션 작업 순서

### Step 1. tailwind.config.ts 수정

1. `ok` 팔레트 추가: `{ 50:'#f0fdf4', 500:'#22c55e', 600:'#16a34a', 700:'#15803d' }`
2. `terra` 팔레트 추가: `{ 50:'#faefed', 100:'#ecd0cc', 500:'#b85e52', 600:'#8b3f35' }`
3. `gold` 팔레트 삭제
4. 기존 `navy` 팔레트 유지

### Step 2. Gold 전역 치환 (gold → navy)

- `bg-gold-*` → `bg-navy-*` (동등 명도 매핑)
- `text-gold-*` → `text-navy-*`
- `border-gold-*` → `border-navy-*`
- `globals.css` 내 gold CSS 변수 → navy로 변경

### Step 3. 시맨틱 컬러 전역 치환

- `text-green-*` (완료 상태) → `text-ok-600`
- `bg-green-*` (완료 아이콘 bg) → `bg-navy-800`
- `text-red-*`, `bg-red-*` (에러/긴급) → `text-terra-*`, `bg-terra-*`
- `text-orange-*`, `bg-orange-*` (경고/대기) → `text-terra-500` (폰트) + `bg-navy-400` (배경)
- `text-purple-*`, `bg-purple-*` (시안/디자인) → `text-navy-600` (폰트) + `bg-navy-700` (배경)
- `text-pink-*`, `bg-pink-*` (SNS) → `text-navy-300` + `bg-navy-300`

### Step 4. P1 — card.tsx 전역 변경

- `border-2 border-gray-200` → `border border-gray-100 shadow-sm`
- CardHeader 패딩: `p-6` → `p-3 pb-2`
- CardContent 패딩: `p-6 pt-0` → `p-3 pt-0`

### Step 5. P2 — 대시보드 핵심 압축 (page.tsx)

- 환영 헤더 200px → 48px (인라인)
- D-Day 뱃지 → pill (임박=terra 폰트, 여유=navy 폰트)
- 내 정보 카드 제거
- 자료 제출률 180px → 44px (인라인 프로그레스바, navy-700)
- 알림 3건 캡 + 더보기 토글 (알림 텍스트=terra 폰트)
- 워크플로우 → 2열 그리드 (폰트 계층화: ok/terra/navy/연한)
- 마케팅 지원 → 아코디언 (72px 접힘)

### Step 6. P3 — 간격 축소 (전역)

- `space-y-6~8` → `space-y-3~4`
- `gap-4~6` → `gap-2~3`
- `mb-6` → `mb-3`
- `border-2` → `border` (전역)

### Step 7. P4 — 서브 페이지 압축

- submission, workflows, communication, design-threads, guides
- meta-ads, announcements, content-tips, homepage, status, signup

### Step 8. 이메일 템플릿 3개 Navy 업데이트

- `lib/email/resendClient.ts`
- `#667eea→#764ba2` 그라디언트 → Navy 그라디언트

## 참조 파일

| 파일                                          | 용도                          |
| --------------------------------------------- | ----------------------------- |
| `design-remodel-wireframe-v4-dual-layer.html` | 최종 와이어프레임 (승인 완료) |
| `design-remodel-wireframe-v3-2axis.html`      | 2축 중간 버전 (참고용)        |
| `semantic-color-proposal.html`                | v2 제안서 (폐기)              |
| `NEXT_SESSION_layout-compression.md`          | 전체 페이지 분석 (P1~P5 상세) |
| `components/ui/card.tsx`                      | P1 전역 패딩/border           |
| `app/dashboard/page.tsx`                      | P2 핵심 압축                  |
| `tailwind.config.ts`                          | 팔레트 수정 대상              |
| `app/globals.css`                             | CSS 변수 수정 대상            |
| `lib/email/resendClient.ts`                   | 이메일 템플릿 3개             |

## 컬러 정책 최종

- **Navy 팔레트**: 배경/구조용 (유지)
- **Gold 팔레트**: 삭제
- **ok 팔레트**: 완료 폰트용 (신규)
- **terra 팔레트**: 주의/에러 폰트용 (신규)
- **기존 green/red/orange/purple/pink**: 전부 ok + terra + navy로 대체
- **gray**: 비활성 UI용 유지 (시맨틱과 무관한 순수 UI)

## 이전 세션 이력

- `3bac77a`: Navy/Gold 컬러 리뉴얼 (84파일)
- `b6bb5f7`: 잔존 blue 제거 + 모바일 오버플로우 수정
- 시맨틱 v2 (3축) 제안 → 폐기
- 와이어프레임 v3 (2축) → v4 (이중 레이어) 확정
