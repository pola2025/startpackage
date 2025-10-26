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

## 프론트엔드-백엔드 검증 일치 원칙

### ⚠️ 중요: 양방향 검증 규칙 동기화

**원칙:** 사용자 입력을 검증하는 모든 로직은 프론트엔드와 백엔드에서 **완전히 일치**해야 합니다.

### 왜 중요한가?

불일치 시 발생하는 문제:
- ❌ 프론트엔드 통과 → 백엔드 실패 (사용자 혼란)
- ❌ 타입 불일치로 런타임 오류
- ❌ 디버깅 시간 낭비

### 검증 항목 체크리스트

새로운 입력 폼을 만들 때 반드시 확인:

#### 1. 비밀번호 검증
**프론트엔드**: `app/signup/page.tsx` (또는 관련 폼 컴포넌트)
```tsx
// ✅ 올바른 예시
if (!/^\d{4}$/.test(password)) {
  setError("비밀번호는 숫자 4자리로 입력해주세요.");
  return;
}
```

**백엔드**: `app/api/auth/signup/route.ts`
```typescript
// ✅ 올바른 예시
password: z
  .string()
  .regex(
    /^\d{4}$/,  // 프론트엔드와 동일한 정규식
    "비밀번호는 숫자 4자리로 입력해주세요."  // 프론트엔드와 동일한 메시지
  ),
```

#### 2. ID 형식 검증 (UUID vs CUID)

**Prisma 스키마 확인**: `prisma/schema.prisma`
```prisma
model Cohort {
  id String @id @default(cuid())  // ← cuid 사용
  // ...
}
```

**백엔드 검증**:
```typescript
// ❌ 잘못된 예시
cohortId: z.string().uuid()  // Prisma는 CUID 사용하는데 UUID 검증

// ✅ 올바른 예시
cohortId: z.string().cuid()  // Prisma와 일치
```

#### 3. 이메일/전화번호 형식

**프론트엔드**:
```tsx
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
```

**백엔드**:
```typescript
이메일: z.string().email(),
연락처: z.string().regex(
  /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,  // 프론트엔드와 동일
  "올바른 전화번호 형식이 아닙니다."
),
```

### 매칭 확인 프로세스

새로운 검증 로직 추가 시:

```
1. Prisma 스키마 확인
   ↓
2. 백엔드 Zod 스키마 작성
   ↓
3. 프론트엔드 검증 작성
   ↓
4. 정규식, 메시지, 타입 일치 확인
   ↓
5. 테스트: 프론트 통과 → 백엔드 통과 확인
```

### 체크리스트

- [ ] **정규식 일치**: 프론트엔드와 백엔드가 동일한 regex 사용
- [ ] **에러 메시지 일치**: 동일한 문구로 사용자 경험 통일
- [ ] **타입 일치**: UUID vs CUID, String vs Number 등
- [ ] **필수/선택 일치**: required 속성과 optional() 일치
- [ ] **길이 제한 일치**: minLength, maxLength 동일
- [ ] **형식 검증 일치**: email, url, phone 등

### 공통 검증 규칙 예시

#### 현재 프로젝트 표준

| 항목 | 검증 규칙 | 프론트엔드 | 백엔드 |
|-----|----------|-----------|--------|
| 비밀번호 (일반 회원) | 숫자 4자리 | `/^\d{4}$/` | `z.string().regex(/^\d{4}$/)` |
| 이메일 | 표준 형식 | `type="email"` | `z.string().email()` |
| 연락처 | 010-1234-5678 | `/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/` | 동일 regex |
| 기수 ID | CUID 형식 | 별도 검증 불필요 | `z.string().cuid()` |
| 이름 | 한글/영문 2-50자 | `minLength={2}` | `z.string().min(2).max(50).regex(/^[가-힣a-zA-Z\s]+$/)` |

### 검증 불일치 디버깅

오류 발생 시 확인 순서:

1. **브라우저 콘솔**: 프론트엔드 검증 통과 확인
2. **Network 탭**: API 응답의 `details` 필드 확인
   ```json
   {
     "error": "입력값이 유효하지 않습니다.",
     "details": [
       {
         "field": "password",
         "message": "비밀번호는 숫자 4자리로 입력해주세요."
       }
     ]
   }
   ```
3. **Prisma 스키마**: 실제 DB 타입 확인
4. **백엔드 Zod 스키마**: 검증 규칙 확인
5. **프론트엔드 검증**: 동일한 규칙 적용 확인

### 개선 권장사항

**공통 검증 라이브러리 생성** (선택사항):
```typescript
// lib/validation/schemas.ts
import { z } from "zod";

export const ValidationSchemas = {
  password: z.string().regex(/^\d{4}$/, "비밀번호는 숫자 4자리로 입력해주세요."),
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  phone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 전화번호 형식이 아닙니다."),
  name: z.string().min(2).max(50).regex(/^[가-힣a-zA-Z\s]+$/, "이름은 한글 또는 영문만 입력 가능합니다."),
};

// 프론트엔드에서 사용
export const ValidationRegex = {
  password: /^\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/,
  name: /^[가-힣a-zA-Z\s]+$/,
};
```

---

*작성일: 2025-10-25*
*추천 라이브러리: react-calendar*
*업데이트: 2025-10-26 (프론트엔드-백엔드 검증 일치 원칙 추가)*
