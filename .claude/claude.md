# Claude Code 프로젝트 노트

## 기본 작업 프로세스: ReAct + Chain-of-Thought

**정의:** 모든 작업 시 계획 → 추론 → 점검 → 시뮬레이션 → 요약 → 실행 프로세스 적용

**프로세스:**

1. **Plan (계획)** - 작업 분석 및 계획 수립
   - 요구사항 파악
   - 필요한 도구/파일 확인
   - 작업 단계 나열

2. **Reason (추론)** - 단계별 논리적 사고
   - 각 단계의 이유 설명
   - 잠재적 문제점 예측
   - 대안 검토

3. **Verify (점검)** - 계획 검증
   - 누락된 단계 확인
   - 의존성 체크
   - 위험 요소 평가

4. **Simulate (시뮬레이션)** - 결과 예측
   - 각 단계 실행 시 예상 결과
   - 부작용 검토
   - 롤백 계획

5. **Summarize (요약)** - 사용자에게 보고
   - 작업 계획 요약
   - 예상 결과 설명
   - 확인 필요 사항 질문

6. **Execute (실행)** - 승인 후 실행
   - 계획대로 순차 실행
   - 각 단계 결과 확인
   - 최종 검증 및 보고

**적용 예시:**

```
사용자: "로그인 기능 추가해줘"

[Plan]
- DB 스키마 확인
- API 라우트 생성
- 프론트엔드 폼 작성
- 인증 로직 구현

[Reason]
- Prisma User 모델 필요 → 스키마 확인 필요
- Next.js 15 → params Promise 처리
- 비밀번호 검증 규칙 → 프론트/백엔드 일치

[Verify]
- ✅ Prisma 스키마 존재 여부
- ✅ 기존 인증 로직 충돌 여부
- ✅ 환경변수 설정 여부

[Simulate]
- POST /api/auth/login 생성 예상
- 성공 시 → 세션 생성, 리다이렉트
- 실패 시 → 에러 메시지 표시

[Summarize]
"로그인 기능을 다음 순서로 구현합니다:
1. Prisma User 스키마 확인
2. /api/auth/login 라우트 생성
3. 로그인 폼 컴포넌트 작성
4. 세션 관리 설정
진행할까요?"

[Execute]
(사용자 승인 후 실행)
```

**원칙:**

- ✅ 복잡한 작업은 반드시 이 프로세스 적용
- ✅ 요약 단계에서 사용자 확인 받기
- ✅ 실행 전 예상 결과 명확히 설명
- ❌ 추측이나 가정으로 바로 실행 금지
- ❌ 요약 없이 침묵 실행 금지

---

## 달력 라이브러리: react-calendar 사용

**이유:** react-day-picker는 shadcn/ui buttonVariants와 충돌, CSS 크기 조정 복잡

**설치:**

```bash
npm install react-calendar
```

**기본 컴포넌트** (`components/ui/calendar.tsx`):

```tsx
"use client";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export function CustomCalendar({ selected, onSelect, disabled }) {
  return (
    <Calendar
      value={selected}
      onChange={(value) => value instanceof Date && onSelect?.(value)}
      tileDisabled={({ date }) => {
        const day = date.getDay();
        return day === 0 || day === 6 || disabled?.(date);
      }}
      locale="ko-KR"
      formatDay={(locale, date) => date.getDate().toString()}
    />
  );
}
```

**스타일 포인트** (globals.css):

```css
.react-calendar {
  width: 500px !important;
} /* 크기 조정 */
.react-calendar__month-view__days__day {
  height: 40px !important;
} /* 셀 높이 */
```

---

## Next.js 15: Params는 Promise

**문제:** Next.js 15에서 동적 라우트 `params`가 Promise로 변경

**해결:**

```typescript
// ❌ 잘못된 코드
export async function POST(req, { params }: { params: { id: string } }) {
  const id = params.id;
}

// ✅ 올바른 코드
export async function POST(
  req,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
}
```

**적용:** `app/api/**/[id]/route.ts` 모든 동적 라우트

---

## 프론트엔드-백엔드 검증 일치

**원칙:** 입력 검증 로직은 프론트엔드와 백엔드에서 완전히 동일해야 함

**주요 검증 규칙:**

| 항목     | 규칙       | 프론트엔드                          | 백엔드                          |
| -------- | ---------- | ----------------------------------- | ------------------------------- |
| 비밀번호 | 숫자 4자리 | `/^\d{4}$/`                         | `z.string().regex(/^\d{4}$/)`   |
| 연락처   | 010 형식   | `/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/` | 동일 regex                      |
| 기수 ID  | CUID       | -                                   | `z.string().cuid()` (UUID 아님) |
| 이메일   | 표준 형식  | `type="email"`                      | `z.string().email()`            |

**체크:**

- 정규식 동일
- 에러 메시지 동일
- Prisma 스키마 타입과 일치 (UUID vs CUID)

---

## 개발 서버 프로세스 관리

**문제:** `npm run dev` 실행 시 Prisma 파일 잠금

**해결:**

```bash
# 백그라운드 실행
npm run dev  # Shell ID 기록

# 작업 완료 후 해당 Shell만 종료
KillShell([shell_id])

# 또는 포트로 PID 확인 후 종료
netstat -ano | findstr :3000
taskkill //F //PID [PID번호]
```

**주의:**

- ❌ `taskkill //F //IM node.exe` - 모든 Node 프로세스 종료 (위험)
- ✅ `KillShell([shell_id])` - 특정 Shell만 종료 (안전)

---

## 아키텍처 우선 원칙 (MANDATORY)

**모든 신규 기능/파일 생성 전 반드시:**

1. `docs/PROJECT_CONVENTIONS.md` 확인
   - Role 패턴 준수 여부 확인
   - API 네이밍 패턴 확인
   - 기존 컴포넌트 패턴과 일치 여부 확인

2. 새 패턴이 추가될 경우 `docs/PROJECT_CONVENTIONS.md` 업데이트 후 진행

3. 확인 체크리스트:
   - [ ] Role 체크: `["super", "designer", "operator"].includes(userRole)` 패턴 사용
   - [ ] API 라우트: `/api/admin/[resource]` 또는 `/api/admin/[resource]/[id]` 패턴
   - [ ] 컴포넌트명: `[Feature]Page` / `[Feature]Client` / `[Feature]Dialog` 패턴
   - [ ] Next.js 15 params: `Promise<{ id: string }>` + `await params`

---

## 아키텍처 규칙: Role & 컴포넌트 네이밍

### 관리자 Role 값 (CRITICAL)

| role       | 설명            |
| ---------- | --------------- |
| `super`    | 슈퍼 관리자     |
| `designer` | 디자이너 관리자 |
| `operator` | 운영 관리자     |

> ❌ `"admin"` role은 **존재하지 않음** — 절대 사용 금지

**권한 체크 필수 패턴:**

```typescript
// 서버 컴포넌트
const userRole = (session?.user as any)?.role;
if (!session || !["super", "designer", "operator"].includes(userRole)) {
  redirect("/admin/login");
}

// API Route
const userRole = (session?.user as any)?.role;
if (!session || !["super", "designer", "operator"].includes(userRole)) {
  return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
}
```

### 컴포넌트 네이밍 패턴

| 패턴                 | 예시               | 용도                     |
| -------------------- | ------------------ | ------------------------ |
| `[Feature]Page`      | `CohortsPage`      | 서버 컴포넌트 (page.tsx) |
| `[Feature]Client`    | `AlertsClient`     | 클라이언트 컴포넌트      |
| `[Feature]Actions`   | `WorkflowActions`  | 액션 버튼 모음           |
| `[Feature]Dialog`    | `EditCohortDialog` | 다이얼로그               |
| `Add[Feature]Button` | `AddCohortButton`  | 추가 버튼                |
| `[Feature]List`      | `CohortsList`      | 목록 컴포넌트            |

### API 라우트 네이밍 패턴

```
/api/admin/[resource]          → GET(목록) / POST(생성)
/api/admin/[resource]/[id]     → PATCH(수정) / DELETE(삭제)
/api/admin/[resource]/create   → POST (기존 레거시 패턴)
```

> 상세 전체 목록: `docs/PROJECT_CONVENTIONS.md` 참조

---

## 유저 메모리: 작업 방식 선호도

**작업 프로세스:** ReAct + Chain-of-Thought 조합

- 계획 → 추론 → 점검 → 시뮬레이션 → 요약 → 실행
- 복잡한 작업 시 반드시 사용자에게 요약 보고 후 승인받고 실행
- 침묵 실행 금지, 항상 예상 결과 설명

**커뮤니케이션 스타일:**

- 추측 금지, 불확실하면 질문
- 구체적 결과 보고 ("완료" 대신 "결과: [상세내용]")
- 한글 문서 작성 시 Write 도구만 사용

---

_최종 업데이트: 2026-02-26_
