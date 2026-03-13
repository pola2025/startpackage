# 다음 세션: 흰색 기본 + 상태별 색상 전면 적용

## 목표

모든 UI 박스/카드의 기본 배경을 흰색으로 통일, 상태가 있을 때만 배경색 부여

## 문서

- PRD: `docs/PRD_white-default-status-color.md`
- TDD: `docs/TDD_white-default-status-color.md`
- 와이어프레임: `docs/sidebar-wireframe-v2.html` (이미 원칙 적용 완료)

## CRITICAL BUG (최우선)

- `terra`/`ok` 색상이 `tailwind.config.ts`에 미정의 → 151곳 상태 뱃지 색상 미렌더링
- Phase 0에서 즉시 수정 필요

## 실행 순서

1. **Phase 0**: tailwind.config.ts에 terra/ok 색상 토큰 추가
2. **Phase 1**: card.tsx (border-2→border), progress-bar.tsx 단색화
3. **Phase 2~6**: 페이지별 적용 (TDD 참조, ~33개 파일)

## 핵심 원칙

- 박스 배경 = 흰색 (기본)
- 배경색 = 확인필요(terra)만 tint 부여
- 완료/배송중/대기 등 = 텍스트 색상으로만 표현
- 그라데이션 전면 제거
- border-2 → border 전역 통일

## 변경하지 않는 것

- 사이드바 bg-navy-900, 버튼, 프로그레스 바 채움, 아이콘 내부, 칸반 컬럼 헤더, 폼 에러 bg-red-50, Pola 브랜드색
