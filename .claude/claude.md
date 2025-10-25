# Claude Code 프로젝트 노트

## 달력 라이브러리 선택 가이드

### ✅ 추천: react-calendar

**왜 react-calendar를 사용해야 하는가?**

1. **간단한 크기 조정**
   - CSS로 직접 제어 가능
   - px 단위로 명확한 크기 설정
   - 복잡한 CSS 변수나 우선순위 문제 없음

2. **쉬운 커스터마이징**
   - 명확한 클래스 네이밍 (`.react-calendar__*`)
   - formatDay, tileClassName 등 유연한 API
   - 주말 처리, disabled 처리 간단

3. **안정적인 동작**
   - shadcn/ui buttonVariants와 충돌 없음
   - Tailwind CSS와 호환성 우수

### ❌ 비추천: react-day-picker (shadcn/ui 기본)

**문제점:**

1. **buttonVariants 충돌**
   - shadcn/ui의 buttonVariants가 기본 h-10 클래스 강제 적용
   - Tailwind 유틸리티 클래스보다 높은 우선순위
   - CSS 변수로만 제어 가능 → 복잡함

2. **크기 조정의 어려움**
   ```
   buttonVariants의 h-10 (기본 size)
     vs
   Tailwind 클래스 h-16
     vs
   globals.css의 --rdp-cell-size

   결과: buttonVariants가 승리 → 원하는 크기 적용 안 됨
   ```

3. **복잡한 스타일 구조**
   - `.rdp-*` 클래스가 DOM에 자동 생성
   - CSS 변수 의존성 높음
   - 디버깅 어려움

## react-calendar 설정 가이드

### Step 1: 설치

```bash
npm install react-calendar
```

### Step 2: calendar.tsx 작성

```tsx
"use client"

import * as React from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

export type CalendarProps = {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

function CustomCalendar({
  selected,
  onSelect,
  disabled,
  className,
}: CalendarProps) {
  return (
    <div className="w-fit">
      <Calendar
        value={selected}
        onChange={(value) => {
          if (value instanceof Date) {
            onSelect?.(value)
          }
        }}
        tileDisabled={({ date }) => {
          const day = date.getDay()
          const isWeekend = day === 0 || day === 6
          if (isWeekend) return true
          if (disabled) return disabled(date)
          return false
        }}
        tileClassName={({ date }) => {
          const day = date.getDay()
          if (day === 0) return "weekend-sunday"
          if (day === 6) return "weekend-saturday"
          return ""
        }}
        className={className}
        locale="ko-KR"
        formatDay={(locale, date) => date.getDate().toString()}
      />
    </div>
  )
}

CustomCalendar.displayName = "Calendar"

export { CustomCalendar as Calendar }
```

### Step 3: globals.css 스타일

```css
/* React Calendar Styles */
.react-calendar {
  width: 500px !important;
  max-width: 500px !important;
  border: none !important;
  background: transparent !important;
  font-family: inherit !important;
  line-height: 1.125em !important;
}

.react-calendar__navigation {
  display: flex !important;
  height: 60px !important;
  margin-bottom: 1rem !important;
}

.react-calendar__navigation button {
  min-width: 60px !important;
  background: transparent !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  color: hsl(var(--foreground)) !important;
  border: 1px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  transition: all 0.2s !important;
}

.react-calendar__navigation button:hover {
  background: hsl(var(--accent)) !important;
}

.react-calendar__month-view__weekdays {
  text-align: center !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  color: hsl(var(--muted-foreground)) !important;
}

.react-calendar__month-view__weekdays__weekday {
  padding: 1rem !important;
}

.react-calendar__month-view__weekdays__weekday abbr {
  text-decoration: none !important;
}

.react-calendar__month-view__days__day {
  height: 40px !important;
  font-size: 0.85rem !important;
  border-radius: 0.5rem !important;
  transition: all 0.2s !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  color: hsl(var(--foreground)) !important;
}

.react-calendar__month-view__days__day:hover {
  background: hsl(var(--muted)) !important;
}

.react-calendar__tile--active {
  background: hsl(var(--primary)) !important;
  color: hsl(var(--primary-foreground)) !important;
  font-weight: 600 !important;
}

.react-calendar__tile--now {
  background: hsl(var(--accent)) !important;
  font-weight: 600 !important;
  color: hsl(var(--accent-foreground)) !important;
}

/* 주말 스타일 */
.weekend-saturday {
  color: #1e40af !important;
  opacity: 0.5 !important;
}

.weekend-sunday {
  color: #dc2626 !important;
  opacity: 0.5 !important;
}
```

## 크기 조정

**매우 간단합니다!**

### 전체 달력 크기
```css
.react-calendar {
  width: 500px !important;  /* 이 값만 변경 */
}
```

### 날짜 셀 높이
```css
.react-calendar__month-view__days__day {
  height: 40px !important;  /* 이 값만 변경 */
  font-size: 0.85rem !important;  /* 폰트 크기도 조정 */
}
```

## 주요 기능

### 1. 날짜 형식 (숫자만 표시)
```tsx
formatDay={(locale, date) => date.getDate().toString()}
```

### 2. 주말 선택 불가
```tsx
tileDisabled={({ date }) => {
  const day = date.getDay()
  return day === 0 || day === 6  // 일요일=0, 토요일=6
}}
```

### 3. 주말 색상 구분
```tsx
tileClassName={({ date }) => {
  const day = date.getDay()
  if (day === 0) return "weekend-sunday"
  if (day === 6) return "weekend-saturday"
  return ""
}}
```

## 체크리스트

달력 설정 시 확인사항:
- [ ] react-calendar 패키지 설치
- [ ] calendar.tsx 파일 작성
- [ ] globals.css에 스타일 추가
- [ ] import "react-calendar/dist/Calendar.css" 포함
- [ ] 크기는 globals.css에서만 조정
- [ ] 한국어 설정: locale="ko-KR"

---

## Next.js 15 동적 라우트 Params 타입 오류

### ⚠️ 중요: Next.js 15 Breaking Change

**문제:**
Next.js 15에서 동적 라우트의 `params`가 동기 객체에서 **Promise로 변경**되었습니다.

**증상:**
```
Type error: Route "app/api/.../[id]/route.ts" has an invalid "POST" export:
  Type "{ params: { id: string; }; }" is not a valid type for the function's second argument.
```

### ❌ 잘못된 코드 (Next.js 14 스타일)

```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }  // ❌ 동기 객체
) {
  const workflowId = params.id;  // ❌ await 없음
  // ...
}
```

### ✅ 올바른 코드 (Next.js 15)

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ✅ Promise 타입
) {
  const { id: workflowId } = await params;  // ✅ await 필수
  // ...
}
```

### 적용 대상 파일

동적 라우트를 사용하는 모든 API 파일:
- `app/api/**/[id]/route.ts`
- `app/api/**/[workflowId]/route.ts`
- `app/api/**/[userId]/route.ts`
- 기타 `[...]` 패턴을 사용하는 모든 라우트

### 체크리스트

새로운 동적 라우트 API를 작성할 때:
- [ ] params 타입을 `Promise<{ ... }>` 로 선언
- [ ] params 사용 시 반드시 `await` 사용
- [ ] 구조 분해 할당으로 깔끔하게 추출: `const { id } = await params`
- [ ] 기존 Next.js 14 코드는 모두 마이그레이션 필요

### 자동 검색 방법

기존 코드에서 수정이 필요한 파일 찾기:
```bash
# Windows PowerShell
Get-ChildItem -Path "app/api" -Recurse -Include "*route.ts" | Select-String "params }: { params: {" -CaseSensitive
```

### 참고 자료

- Next.js 15 공식 문서: https://nextjs.org/docs/app/building-your-application/upgrading/version-15
- 마이그레이션 가이드: Params 섹션 참조

---

*작성일: 2025-10-25*
*추천 라이브러리: react-calendar*
*업데이트: 2025-10-25 (Next.js 15 params 타입 오류 추가)*
