# 세션 핸드오프: 비즈니스 홈페이지 스타일 4종 확장

**날짜**: 2026-03-05
**상태**: 와이어프레임 제안서 완성, 프로토타입 대기

## 완료된 작업

### 1. 리서치 & 분석

- Google 웹서치로 2025-2026 미니멀 비즈니스/금융/관공서 웹디자인 트렌드 조사
- Stripe, Linear, Apple, Goldman Sachs, Vanguard, GOV.UK 등 참조 사이트 분석
- Day1 Design(F:\day1design_homepage) 이메일 템플릿 톤 분석 (다크+골드 -> 라이트 변환)
- 2026 애니메이션 트렌드: scroll-triggered reveal, micro-interaction, 성능 우선

### 2. 와이어프레임 제안서 HTML 제작

- **파일**: `F:\startpackage\docs\design\business-style-proposal-4types.html`
- 밝은 배경 중심 4종 (사용자 피드백 반영, 다크 -> 라이트 전면 재설계)

### 3. 제안된 4개 스타일

| #        | 이름            | 타겟 업종          | 배경 톤            | 액센트             | 핵심 애니메이션              |
| -------- | --------------- | ------------------ | ------------------ | ------------------ | ---------------------------- |
| Style 7  | Civic Blue      | 관공서/법무법인    | White + Sky Blue   | Royal Blue         | Counter Up + Card Lift       |
| Style 8  | Finance Ivory   | 금융/투자/자산관리 | Ivory + Cream      | Gold               | Gold Line Expand + Marquee   |
| Style 9  | Warm Consulting | 컨설팅/회계법인    | Warm White + Cream | Warm Gold + Coffee | Testimonial Carousel + Fade  |
| Style 10 | Clean Tech      | IT/스타트업        | Pure White + Snow  | Violet + Indigo    | Ambient Glow + Bento Stagger |

### 4. 정부정책자금 컨설팅 관점 분석

- Style 7 (Civic Blue) + Style 9 (Warm Consulting) 하이브리드가 최적
- 필수 애니메이션: 실적 카운터, 서비스 흐름 타임라인, 정책자금 종류 카드, 고객 후기 캐러셀, CTA 펄스
- 핵심: "신뢰 + 전문성 + 접근성" — 화려함보다 정보 전달 우선

### 5. 모바일 반응형 (360px 검증 완료)

- 3단계 breakpoint: 768px / 480px / 374px
- word-break: keep-all (한글 고아텍스트 방지)
- overflow-x: hidden 전역 + wireframe overflow hidden
- 360px에서 모든 그리드 1열 강제 스택
- Playwright로 오버플로우 0건 검증 완료 (테이블만 scroll 컨테이너)

## 기존 프로젝트 컨텍스트

### 현재 홈페이지 스타일 6개 (imweb 기반)

```
Style 1: www.jnipartners.co.kr
Style 2: bizen.co.kr
Style 3: jmbiz.imweb.me
Style 4: ksupport-center.imweb.me
Style 5: www.wiztion.com
Style 6: www.k-eai.kr
```

### 스타일 관련 코드 위치

- 스타일 URL 목록: `app/dashboard/homepage/page.tsx` (613-618행, 756-767행)
- 스타일 카드 컴포넌트: `components/submission/style-card-selector.tsx`
- 스타일 정의 문서: `docs/design/Homepage_styleselect.txt`

## 다음 세션 TODO

### Phase 1: 스타일 확정

- [ ] 사용자에게 4종 중 채택할 스타일 확인 (또는 하이브리드 조합)
- [ ] 정부정책자금 컨설팅 특화 섹션 구성 확정

### Phase 2: HTML 프로토타입 제작

- [ ] 확정된 스타일로 실제 홈페이지 HTML 프로토타입 제작
- [ ] 실제 텍스트/이미지 플레이스홀더 적용
- [ ] 애니메이션 구현 (IntersectionObserver + CSS)
  - 숫자 카운터 (승인건수, 누적금액)
  - 서비스 흐름 타임라인 (상담->서류->신청->승인)
  - 카드 hover lift + stagger reveal
  - 고객 후기 캐러셀 (scroll-snap)
  - CTA 펄스 + 모바일 하단 고정
- [ ] 360px ~ 1440px 전 구간 반응형 검증

### Phase 3: 프로덕션 통합

- [ ] imweb 커스텀 코드 또는 별도 정적 호스팅(Vercel) 결정
- [ ] `app/dashboard/homepage/page.tsx`에 Style 7-10 URL 추가
- [ ] iframe 프리뷰 테스트
- [ ] 배포 및 검증

## 참고 파일

- 와이어프레임 제안서: `docs/design/business-style-proposal-4types.html`
- Day1 참조 이메일: `F:\day1design_homepage\email-template-preview.html`
- Day1 참조 와이어프레임: `F:\day1design_homepage\the-premium-wireframe.html`
