# Next Session: 와이어프레임에 SVG 애니메이션 적용

## 현재 상태

### SVG Animation Archive (완료)

- **101개 소형 아이콘** (24x24, 50개 HQ 업그레이드)
- **100개 씬 애니메이션** (10개 HTML 파일)
  - finance-scenes.html (10개)
  - document-scenes.html (10개)
  - growth-scenes.html (10개)
  - trust-scenes.html (10개)
  - navigation-scenes.html (10개)
  - **communication-scenes.html** (10개) — 기본
  - **communication-consult-scenes.html** (10개) — 상담/접수
  - **communication-progress-scenes.html** (10개) — 진행/소통
  - **communication-approve-scenes.html** (10개) — 승인/완료
  - **communication-connect-scenes.html** (10개) — 연결/관계

### 파일 위치

- 작업: `F:\startpackage\public\svg-animations\`
- 아카이브: `F:\pola_templates\svg-animation-archive\`
- 통합 인덱스: `public/svg-animations/index.html`

### 디자인 시스템

- Navy #0d1b2a, Gold #b08d3e, Coffee #6b5344
- Gold-light #c9a84c, OK #16a34a, Terra #b85e52
- 폰트: Pretendard
- 애니메이션 패턴: `.play` 클래스 + IntersectionObserver + cubic-bezier bounce

## 다음 세션 TODO

### 1. 와이어프레임 현황 파악

- 이모지 사용 현황 조사 (약 50종, guides/page.tsx와 submission/page.tsx에 집중)
- 4개 와이어프레임 HTML 확인:
  - `design-remodel-wireframe-v4-dual-layer.html`
  - `design-proposal-completion-hierarchy.html`
  - `docs/design/business-style-proposal-4types.html`
  - `semantic-color-proposal.html`

### 2. 이모지 → SVG 아이콘 매핑 계획

- 각 이모지가 어떤 SVG 아이콘으로 대체될지 매핑 테이블 작성
- 101개 아이콘 중 사용할 것 선별
- 매핑 안 되는 이모지 → 신규 아이콘 필요 여부 판단

### 3. 씬 애니메이션 배치 계획

- 100개 씬 중 와이어프레임 각 섹션에 적합한 씬 선별
- 히어로/CTA/프로세스 등 섹션별 씬 할당
- Communication 50개가 메인 — 상담→접수→진행→승인→완료 흐름에 최적

### 4. 구현

- React 컴포넌트로 SVG 아이콘 래핑 (AnimatedIcon 컴포넌트)
- 씬 애니메이션 → React 컴포넌트 변환 또는 iframe 임베드
- 기존 이모지 코드 일괄 교체

## 참조

- 고퀄 참조: `F:\pola_templates\style-9-warm-consulting\animation-showcase.html`
- SVG 스펙: `public/svg-animations/SPEC.md`
