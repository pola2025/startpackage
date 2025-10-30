# Claude Code 프로젝트 노트

## 달력 라이브러리: react-calendar 사용

**이유:** react-day-picker는 shadcn/ui buttonVariants와 충돌, CSS 크기 조정 복잡

**설치:**
```bash
npm install react-calendar
```

**기본 컴포넌트** (`components/ui/calendar.tsx`):
```tsx
"use client"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

export function CustomCalendar({ selected, onSelect, disabled }) {
  return (
    <Calendar
      value={selected}
      onChange={(value) => value instanceof Date && onSelect?.(value)}
      tileDisabled={({ date }) => {
        const day = date.getDay()
        return day === 0 || day === 6 || disabled?.(date)
      }}
      locale="ko-KR"
      formatDay={(locale, date) => date.getDate().toString()}
    />
  )
}
```

**스타일 포인트** (globals.css):
```css
.react-calendar { width: 500px !important; } /* 크기 조정 */
.react-calendar__month-view__days__day { height: 40px !important; } /* 셀 높이 */
```

---

## Next.js 15: Params는 Promise

**문제:** Next.js 15에서 동적 라우트 `params`가 Promise로 변경

**해결:**
```typescript
// ❌ 잘못된 코드
export async function POST(req, { params }: { params: { id: string } }) {
  const id = params.id
}

// ✅ 올바른 코드
export async function POST(req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

**적용:** `app/api/**/[id]/route.ts` 모든 동적 라우트

---

## 프론트엔드-백엔드 검증 일치

**원칙:** 입력 검증 로직은 프론트엔드와 백엔드에서 완전히 동일해야 함

**주요 검증 규칙:**

| 항목 | 규칙 | 프론트엔드 | 백엔드 |
|-----|------|-----------|--------|
| 비밀번호 | 숫자 4자리 | `/^\d{4}$/` | `z.string().regex(/^\d{4}$/)` |
| 연락처 | 010 형식 | `/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/` | 동일 regex |
| 기수 ID | CUID | - | `z.string().cuid()` (UUID 아님) |
| 이메일 | 표준 형식 | `type="email"` | `z.string().email()` |

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

*최종 업데이트: 2025-10-30*
