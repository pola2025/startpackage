# Next Session: Remotion 가이드 영상 제작

## 현재 상태

### 완료된 작업

- **와이어프레임 개선** (`docs/guide-videos-wireframe.html`)
  - 9:16 / 16:9 비율 토글 추가 (5개 탭 모두)
  - 오토플레이 토글 (재생/정지) + 빨간 상태 표시
  - 씬 전환 개선 (visibility + z-index로 겹침 해결)
  - 스페이스바 단축키 추가

- **Remotion 초기 설치** (방향 전환 필요)
  - 패키지: remotion, @remotion/cli, @remotion/player 설치됨
  - 파일: `remotion/` 디렉토리 (Root.tsx, index.ts, styles.ts, components/, compositions/)
  - 스크립트: `npm run remotion:studio`, `npm run remotion:render`
  - 1번 영상(자료제출) 목업 버전 완성 → **사용 안 함**

### 방향 전환 (CRITICAL)

- ❌ 현재: 와이어프레임 목업을 그대로 영상으로 만듦 → 텍스트 작고 실제 앱과 무관
- ✅ 올바른 방향: **실제 프로덕션 페이지 기준**
  - 실제 페이지 스크린샷/녹화 → 큰 텍스트 오버레이 + 포인터/하이라이트
  - 각 화면이 뭐하는 곳인지 충분한 시간 동안 설명
  - 프로덕션 페이지 개선 작업 완료 후 진행

## 다음 세션 TODO

### 1. 프로덕션 페이지 스크린샷 캡처

- `/dashboard/submission` — 자료제출
- `/dashboard/design-threads` — 시안확인·컨펌
- `/dashboard/workflows` — 발주요청 / 제작소요기간
- 로고 주의사항 관련 UI

### 2. Remotion 재구현

- 기존 `remotion/compositions/Video1Submission.tsx` 삭제 또는 재작성
- 접근: 스크린샷 이미지 + 오버레이 텍스트 + 포인터 애니메이션
- 텍스트 크기 충분히 크게 (모바일에서도 읽힘)
- 씬당 시간 여유롭게

### 3. 5편 영상 스펙 (와이어프레임 기준)

| 영상             | 관련 페이지                              | 씬 수 |
| ---------------- | ---------------------------------------- | ----- |
| 1. 자료제출      | /dashboard/submission                    | 5     |
| 2. 시안확인·컨펌 | /dashboard/design-threads                | 4     |
| 3. 발주요청      | /dashboard/workflows                     | 4     |
| 4. 제작소요기간  | /dashboard/workflows + /dashboard/status | 4     |
| 5. 로고 주의사항 | /dashboard/submission (로고 섹션)        | 4     |

## 참조 파일

- 와이어프레임: `docs/guide-videos-wireframe.html`
- Remotion 진입점: `remotion/index.ts`
- 공통 컴포넌트: `remotion/components/common.tsx` (재사용 가능)
- 디자인 토큰: `remotion/styles.ts`
