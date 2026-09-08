# 진행률 게임화 UI — 활용 가능 기술 스택 분석

> 와이어프레임(`wireframe-progress-gamification.html`, `wireframe-print-stage-tracker.html`) 구현을 위한 기술 탐색
>
> 작성일: 2026-05-07

---

## 1. 현재 프로젝트 스택 (활용 가능 자산)

| 카테고리    | 보유 기술                             | 진행률 UI 활용도 |
| ----------- | ------------------------------------- | ---------------- |
| Framework   | Next.js 15.5 + React 19 + TypeScript  | ⭐⭐⭐⭐⭐       |
| 스타일      | Tailwind 3.4 + tailwindcss-animate    | ⭐⭐⭐⭐⭐       |
| UI 컴포넌트 | shadcn/ui (Radix Primitives)          | ⭐⭐⭐⭐⭐       |
| 진행률 바   | `@radix-ui/react-progress`            | ⭐⭐⭐⭐⭐       |
| 툴팁        | `@radix-ui/react-tooltip` (물음표 ❓) | ⭐⭐⭐⭐⭐       |
| 상태관리    | Zustand 5 + TanStack Query 5          | ⭐⭐⭐⭐⭐       |
| 폼          | React Hook Form + Zod                 | ⭐⭐⭐⭐⭐       |
| DB          | Prisma 6 (단계 테이블 추가만 하면 됨) | ⭐⭐⭐⭐⭐       |
| 알림        | Slack Web API + Telegram Bot          | ⭐⭐⭐⭐         |
| 비디오      | Remotion 4 (이미 설치됨)              | ⭐⭐ (가능성)    |

**결론**: 추가 라이브러리 없이도 ⭐⭐⭐⭐ 수준 구현 가능. 시각 임팩트 ⭐⭐⭐⭐⭐ 가려면 1~3개 라이브러리만 더 추가.

---

## 2. 카테고리별 추천 기술

### 2-1. 애니메이션 (흑백→컬러, 잠김→해제, 단계 전환)

| 라이브러리                                 | 번들  | 적합도     | 비고                                                                                         |
| ------------------------------------------ | ----- | ---------- | -------------------------------------------------------------------------------------------- |
| **Framer Motion** (`motion`)               | ~50KB | ⭐⭐⭐⭐⭐ | React 19 호환 / Next.js 15 검증됨. Layout animation, spring, gestures 다 됨. **최우선 추천** |
| **GSAP**                                   | ~70KB | ⭐⭐⭐⭐   | 가장 강력. SVG 모핑·복잡 타임라인. 상용 라이선스 주의 (Free 티어 OK)                         |
| **react-spring**                           | ~30KB | ⭐⭐⭐     | 물리 기반. Framer Motion보다 학습 곡선 ↑                                                     |
| **CSS Animations**                         | 0KB   | ⭐⭐⭐     | 단순 상태 전이는 이걸로 충분 (이미 와이어프레임에서 사용)                                    |
| **Auto-Animate** (`@formkit/auto-animate`) | ~3KB  | ⭐⭐⭐⭐   | 가장 가벼움. 리스트 추가/제거 자동 애니메이션                                                |

**권장**: `framer-motion` 1개로 90% 커버. 단계 전환·카드 등장·hover 효과 모두 처리.

```tsx
// 예시: 인쇄물 잠김→해제 전환
<motion.div
  initial={{ filter: "grayscale(100%)", opacity: 0.5 }}
  animate={{
    filter: status === "unlocked" ? "grayscale(0%)" : "grayscale(100%)",
    opacity: status === "unlocked" ? 1 : 0.5,
  }}
  transition={{ duration: 0.6 }}
/>
```

---

### 2-2. 일러스트 시스템 (나무·디바이스·인쇄물·빌딩)

| 옵션                                | 제작                 | 인터랙션             | 번들          | 적합 컨셉                   |
| ----------------------------------- | -------------------- | -------------------- | ------------- | --------------------------- |
| **순수 SVG (인라인)**               | Figma → SVGR         | 코드로 제어          | 0KB           | ⑤ 나무, ① 인쇄물 줄기       |
| **Lottie** (`lottie-react`)         | After Effects → JSON | 재생/seek            | ~50KB + JSON  | ⑤ 나무 성장, 인쇄물 등장    |
| **Rive** (`@rive-app/react-canvas`) | Rive Editor          | 상태머신 내장 ⭐     | ~150KB + .riv | **②, ⑤ 최강 매치**          |
| **이미지 + CSS filter**             | 디자이너 PNG         | grayscale/hue-rotate | 0KB           | ② 디바이스 (실사 노트북)    |
| **React Three Fiber**               | Blender / GLTF       | 3D 회전              | ~250KB        | ② 디바이스 3D (오버킬 가능) |

**가장 큰 변수**: 디자인 리소스 가용성.

- **디자이너 있음 + 게임화 강조** → **Rive** (디자이너가 직접 인터랙션 정의, 코드 거의 없음)
- **디자이너 있음 + 단순** → **Lottie** (Bodymovin 플러그인으로 AE 출력)
- **디자이너 없음** → **SVG 직접 작성** + Framer Motion (현재 와이어프레임 방식)
- **사진 활용 (실사 노트북)** → **CSS `filter: grayscale()`** + Tailwind (가장 저렴)

**추천 조합 (코스트 효율)**:

- 메인 시각자산: Lottie 1~2개 (나무 성장, 패키지 박스 열기)
- 나머지: SVG + Framer Motion

---

### 2-3. 단계 추적 / 상태 머신 (인쇄물 단계: 시안→확인→발주→배송)

| 옵션                            | 적합도     | 사유                                                                                                                              |
| ------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **XState v5** + `@xstate/react` | ⭐⭐⭐⭐⭐ | **단계 전이 룰을 코드로 명시**. 잘못된 전이 차단(예: "정보입력" → "발주중" 직행 불가). Stately 시각화 도구로 다이어그램 자동 생성 |
| **Zustand 단순 enum**           | ⭐⭐⭐⭐   | 이미 설치됨. 단계 ≤ 6개면 충분. 전이 룰은 함수로                                                                                  |
| **Prisma enum + DB 상태**       | ⭐⭐⭐⭐⭐ | 서버 진실. 클라이언트는 표시만                                                                                                    |

**추천 패턴 (3-Layer)**:

```
┌─ DB (Prisma)
│  PrintPackage.status: enum [INFO_INPUT, DESIGN, REVIEW, ORDERING, SHIPPING, DELIVERED]
│
├─ Server (Next.js API)
│  XState로 전이 검증 (관리자가 REVIEW → DESIGN 으로 되돌리기 등 정의)
│
└─ Client (React)
   TanStack Query polling 또는 SSE 로 상태 구독 → UI 자동 갱신
```

**XState 도입 가치**:

- "발주 확인 요청" 단계에서 사용자 응답 없으면 자동 알림 (after delay)
- "배송중" 단계에서 운송장 정보 필수 (guard)
- 관리자가 임의 단계 점프 시 검증

---

### 2-4. 실시간 단계 업데이트 (관리자 시안 업로드 → 사용자 화면 즉시 변경)

| 옵션                                | 비용             | 구현 난이도   | 적합도                  |
| ----------------------------------- | ---------------- | ------------- | ----------------------- |
| **TanStack Query polling** (5~10초) | 무료             | ★ (이미 설치) | ⭐⭐⭐⭐⭐ **MVP 추천** |
| **Server-Sent Events (SSE)**        | 무료             | ★★            | ⭐⭐⭐⭐                |
| **Pusher Channels**                 | $49/월~          | ★★            | ⭐⭐⭐                  |
| **Ably**                            | 200msg/일 무료   | ★★            | ⭐⭐⭐                  |
| **Supabase Realtime**               | 무료 (별도 가입) | ★★★           | ⭐⭐ (DB 분리 부담)     |
| **WebSocket (직접)**                | 무료             | ★★★★          | ⭐⭐                    |

**추천**: 1단계로 TanStack Query `refetchInterval: 10000` 만으로 충분. 사용자가 단계 페이지에 머무는 시간 짧음.

```tsx
const { data } = useQuery({
  queryKey: ["print-status", packageId],
  queryFn: fetchPrintStatus,
  refetchInterval: 10000, // 10초마다
  refetchOnWindowFocus: true,
});
```

이후 트래픽 늘면 SSE 마이그레이션.

---

### 2-5. 알림 / 피드백 (단계 완료 시 축하)

| 라이브러리                         | 용도                       | 번들  |
| ---------------------------------- | -------------------------- | ----- |
| **Sonner** (shadcn 표준)           | 토스트 알림                | ~10KB |
| **canvas-confetti**                | 단계 완료 컨페티           | ~15KB |
| **react-hot-toast**                | 대안 토스트                | ~6KB  |
| **next/dynamic + Lottie 1회 재생** | 보상 애니메이션            | -     |
| **Web Notifications API**          | 브라우저 푸시 (백그라운드) | 0KB   |

**추천**: `sonner` + `canvas-confetti` 조합. 단계 완료 시:

```tsx
import confetti from "canvas-confetti";
import { toast } from "sonner";

confetti({ particleCount: 100, spread: 70 });
toast.success("🎉 시안 제작 완료! 검토해주세요");
```

---

### 2-6. 차트 / 진행률 표시

| 라이브러리                     | 용도           | 비고                   |
| ------------------------------ | -------------- | ---------------------- |
| **`@radix-ui/react-progress`** | 단순 진행률 바 | **이미 설치**          |
| **Recharts**                   | 도넛/바 차트   | 진행률 도넛 (62% 표시) |
| **Tremor**                     | 대시보드 KPI   | 관리자 측에 어울림     |
| **react-circular-progressbar** | 원형 진행률    | ~5KB, 가벼움           |
| **순수 SVG `<circle>`**        | 원형 진행률    | 0KB, 추천              |

**추천**: 원형 진행률(62% 등)은 SVG 직접 작성. shadcn/ui Progress는 막대용.

---

## 3. 5개 컨셉 × 권장 기술 매핑

| 컨셉                    | 핵심 기술              | 추가 라이브러리                     | 디자인 리소스             |
| ----------------------- | ---------------------- | ----------------------------------- | ------------------------- |
| **① 인쇄물 컬렉션**     | SVG + Framer Motion    | `framer-motion`                     | SVG 인쇄물 5종            |
| **② 디바이스 쇼케이스** | 실사 사진 + CSS filter | `framer-motion`                     | 노트북·모니터·폰 사진 1장 |
| **③ 스타트업 빌딩**     | SVG 블록 + 쌓기 애니   | `framer-motion`                     | SVG 층(레이어) 5종        |
| **④ 퀘스트 보드**       | shadcn/ui Card + 배지  | `framer-motion` + `canvas-confetti` | 이모지/Lucide 아이콘      |
| **⑤ 성장하는 나무**     | **Lottie** ⭐          | `lottie-react` + `framer-motion`    | AE → Lottie JSON 1개      |

**가장 적은 디자인 비용** = ④ 퀘스트 보드 (이모지/아이콘만)
**가장 큰 임팩트** = ⑤ 나무 (Lottie) 또는 ② 디바이스 (실사)

---

## 4. 단계 시각화 (인쇄물 트래커) × 권장 기술

| 옵션                 | 핵심 기술                            | 비고                    |
| -------------------- | ------------------------------------ | ----------------------- |
| **A. 수평 스텝퍼**   | shadcn/ui 컴포넌트 + Tailwind        | **0개 라이브러리 추가** |
| **B. 택배 트래킹**   | Framer Motion (트럭 이동) + 타임라인 | `framer-motion` 1개     |
| **C. 지하철 노선도** | SVG + Framer Motion (역 깜빡임)      | `framer-motion` 1개     |

**모두 XState 또는 Zustand로 단계 상태 관리** (DB enum과 동기화).

---

## 5. 도입 로드맵 (Phase별)

### Phase 1 — MVP (2주)

**목표**: 동작하는 단계 시각화 + 잠김/해제 흐름

추가 라이브러리: `framer-motion`만

- [ ] Prisma 스키마: `PrintPackage`, `PrintStage` 추가
- [ ] enum 정의: `INFO_INPUT | DESIGN | REVIEW | ORDERING | SHIPPING | DELIVERED`
- [ ] API: `GET /api/admin/print-packages/[id]/status`
- [ ] UI: 수평 스텝퍼 컴포넌트 (shadcn 패턴)
- [ ] 잠김 처리: 로고 미완성 시 인쇄물 카드 grayscale + 클릭 차단
- [ ] TanStack Query polling 10s

### Phase 2 — 시각 강화 (2주)

**목표**: 메인 컨셉 1종 시각화 (⑤ 나무 또는 ② 디바이스)

추가 라이브러리: `lottie-react` (선택)

- [ ] 디자이너에게 메인 일러스트 의뢰 (AE → Lottie 또는 SVG)
- [ ] 진행률(%)에 따라 Lottie seek 또는 SVG 마스킹
- [ ] 물음표 툴팁(`@radix-ui/react-tooltip`) 각 필드에 부착

### Phase 3 — 게임화 디테일 (1~2주)

**목표**: 보상감·축하 효과

추가 라이브러리: `canvas-confetti`, `sonner`

- [ ] 단계 완료 시 컨페티 + 토스트
- [ ] 배지 획득 다이얼로그 (Framer Motion bounce)
- [ ] 사용자별 진행 통계 (가입 후 N일째 등)

### Phase 4 — 운영 효율화 (선택)

- [ ] **XState** 도입 — 관리자 측 단계 전이 룰 정형화
- [ ] **SSE** 마이그레이션 — polling → real-time push
- [ ] **Slack/Telegram** 단계 변경 알림 (이미 자산 보유)

---

## 6. 라이브러리별 의사결정표

| 도입 우선순위 | 라이브러리                 | 누적 번들 증가 | 누적 효과                    |
| ------------- | -------------------------- | -------------- | ---------------------------- |
| 🥇 1          | `framer-motion`            | +50KB          | 모든 컨셉 동작 가능          |
| 🥈 2          | `canvas-confetti`          | +15KB          | 보상감 강화                  |
| 🥉 3          | `sonner`                   | +10KB          | 단계 변경 알림 (shadcn 표준) |
| 4             | `lottie-react`             | +50KB          | ⑤ 나무 컨셉 시               |
| 5             | `xstate` + `@xstate/react` | +60KB          | 운영 복잡도 증가 시          |
| 6 (선택)      | `@rive-app/react-canvas`   | +150KB         | 디자이너 Rive 사용 시        |

**1+2+3만 도입해도 5개 컨셉 모두 구현 가능. 누적 +75KB.**

---

## 7. 기술 외 — 디자인 자산 비용 비교

| 컨셉                | 일러스트 제작 시간          | 외주 비용 (한국 기준) |
| ------------------- | --------------------------- | --------------------- |
| ① 인쇄물 컬렉션     | SVG 5종 · 1~2일             | 30~60만원             |
| ② 디바이스 쇼케이스 | 사진 또는 SVG 3종 · 0.5~1일 | 무료(stock) ~ 20만원  |
| ③ 스타트업 빌딩     | SVG 6 레이어 · 1일          | 20~40만원             |
| ④ 퀘스트 보드       | 아이콘만                    | 무료 (Lucide)         |
| ⑤ 성장하는 나무     | Lottie 1개 · 2~3일          | 50~100만원            |

**비용 대비 임팩트 1위: ④ 퀘스트** / **임팩트 1위: ⑤ 나무 또는 ② 디바이스**

---

## 8. 최종 권장 (의사결정용 요약)

### 추천 A — "최소 비용 + 빠른 출시"

- **컨셉**: ④ 퀘스트 보드 (메인) + A. 수평 스텝퍼 (인쇄물 단계)
- **라이브러리**: `framer-motion` + `canvas-confetti` + `sonner`
- **디자인 비용**: 거의 0원 (Lucide 아이콘)
- **개발 기간**: 2~3주
- **번들 추가**: ~75KB

### 추천 B — "최대 임팩트 + 차별화"

- **컨셉**: ⑤ 성장하는 나무 (메인) + B. 택배 트래킹 (인쇄물 단계)
- **라이브러리**: `framer-motion` + `lottie-react` + `canvas-confetti` + `sonner`
- **디자인 비용**: Lottie 1~2개 외주 50~100만원
- **개발 기간**: 4~5주
- **번들 추가**: ~125KB

### 추천 C — "B2B 전문성 + 사진 활용"

- **컨셉**: ② 디바이스 쇼케이스 (실사 노트북·모니터·폰)
- **라이브러리**: `framer-motion` + `sonner`
- **디자인 비용**: stock 사진 활용 시 0~10만원
- **개발 기간**: 2~3주
- **번들 추가**: ~60KB

---

## 9. 다음 액션

승인 시 다음 결정만 하면 됨:

1. **메인 컨셉 1개 선택** (1~5번 중)
2. **인쇄물 단계 옵션 1개 선택** (A·B·C 중)
3. **추천 A/B/C 중 도입 범위 선택** (Phase 1만 먼저 갈지, 한꺼번에 갈지)
4. **디자인 리소스 확보 방법** (외주 / 사내 / Lucide 아이콘 활용)

선택 후 Phase 1 구현 작업으로 진입.
