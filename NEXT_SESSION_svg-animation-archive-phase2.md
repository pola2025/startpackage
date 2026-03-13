# Next Session: SVG Animation Archive Phase 2

## 현재 상태 요약

### 완료된 작업

- **Track A 기초**: 101개 소형 SVG 아이콘 (24x24) 생성 완료
  - 위치: `public/svg-animations/{status,document,finance,navigation,people,notification,design}/`
  - 프리뷰: `public/svg-animations/preview.html` (object 태그, 사이즈/컬러 조절 가능)
  - 품질: 기본 수준 (단순 pulse/rotate). **품질 업그레이드 필요**

### Track B 고퀄 씬 애니메이션 (60개) - 파일 생성 완료, 검수 필요

6개 HTML 파일 모두 생성 완료 (각 2000~3300줄):

| 에이전트          | 카테고리   | 파일                               | 개수 |
| ----------------- | ---------- | ---------------------------------- | ---- |
| aeb8479dc3ea44028 | 자금/금융  | `scenes/finance-scenes.html`       | 10   |
| ad1b333e0fbf1a043 | 서류/절차  | `scenes/document-scenes.html`      | 10   |
| a7e1cc84e33b37cf6 | 성장/진행  | `scenes/growth-scenes.html`        | 10   |
| a24d9de72ac95540c | 보호/신뢰  | `scenes/trust-scenes.html`         | 10   |
| abb92db7d173116eb | 소통/연결  | `scenes/communication-scenes.html` | 10   |
| ad3b367025c8d13e3 | 네비게이션 | `scenes/navigation-scenes.html`    | 10   |

**위치**: `F:\startpackage\public\svg-animations\scenes\`

### 미착수 작업

- **Track A 품질 업그레이드**: 101개 중 50개 선별 → 다단계 키프레임, cubic-bezier, 정교한 path로 리라이트
- **전체 인덱스 페이지**: 50개 씬 + 50개 아이콘 통합 프리뷰

## 다음 세션 TODO

### 1. Track B 결과 검수 (최우선)

- 6개 scenes HTML 파일 존재 여부 확인
- 브라우저에서 열어 애니메이션 품질 검증
- 참조 파일 수준 미달 시 재작업: `F:\pola_templates\style-9-warm-consulting\animation-showcase.html`

### 2. Track A 품질 업그레이드

- 기존 101개 중 50개 선별 (가장 많이 쓰일 것)
- 업그레이드 방향:
  - 단순 ease-in-out → cubic-bezier(0.34, 1.56, 0.64, 1)
  - 1단계 keyframe → 3-5단계 다단계 시퀀스
  - 기본 path → Lucide 수준 정교한 SVG path
  - stroke-dasharray draw-in + 후속 동작 조합

### 3. 통합 인덱스

- 전체 100개 (50 아이콘 + 50 씬) 프리뷰 페이지
- 카테고리별 필터/검색
- 사이즈/컬러 조절

## 참조 파일

- **고퀄 참조**: `F:\pola_templates\style-9-warm-consulting\animation-showcase.html`
  - 6개 씬 애니메이션 (Key&Lock, Puzzle, Seed-to-Tree, Compass, Documents, Bridge)
  - 1511줄, HTML+CSS only
  - 핵심 패턴: .play 클래스 트리거, 시퀀스 타이밍, cubic-bezier 바운스, 멀티요소 조합
- **디자인 시스템 컬러**: Navy #0d1b2a, Gold #b08d3e, Coffee #6b5344, OK #16a34a, Terra #b85e52
- **SVG 스펙**: `public/svg-animations/SPEC.md`

## 프로젝트 컨텍스트

- 정책자금 관련 와이어프레임 4개 컨셉 페이지에서 이모지 대신 사용할 애니메이션
- 와이어프레임 HTML 위치:
  - `design-remodel-wireframe-v4-dual-layer.html`
  - `design-proposal-completion-hierarchy.html`
  - `docs/design/business-style-proposal-4types.html`
  - `semantic-color-proposal.html`
- 이모지 사용 현황: 약 50종, guides/page.tsx와 submission/page.tsx에 집중

## Codex CLI 참고

- `codex exec --full-auto`는 sandbox read-only로 파일 쓰기 불가
- Codex 출력에서 SVG 추출 후 직접 Write하는 방식으로 우회함
- 향후 `-s workspace-write` 또는 `--dangerously-bypass-approvals-and-sandbox` 시도 가능
