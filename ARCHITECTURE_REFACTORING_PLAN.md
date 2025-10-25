# 스타트패키지 시스템 구조 개선 기획서

> **작성일**: 2025-01-XX
> **목적**: 임시방편 없는 근본적 구조 개선, 유지보수 최적화, UI/UX 로직 일관성 확보

---

## 📋 목차

1. [현재 시스템 구조 분석](#1-현재-시스템-구조-분석)
2. [근본 원인 진단](#2-근본-원인-진단)
3. [아키텍처 재설계](#3-아키텍처-재설계)
4. [UI/UX 로직 표준화](#4-uiux-로직-표준화)
5. [유지보수 최적화 방안](#5-유지보수-최적화-방안)
6. [구현 로드맵](#6-구현-로드맵)
7. [검수 체크리스트](#7-검수-체크리스트)

---

## 1. 현재 시스템 구조 분석

### 1.1 인증 시스템 (Authentication)

#### **구조**
```
auth.ts (NextAuth)
├── Credentials Provider
│   ├── 전화번호 로그인 → User 테이블 조회
│   └── 이메일 로그인 → User 테이블 → Admin 테이블 순차 조회
└── Callbacks
    ├── jwt(): role, cohortId 저장
    └── session(): 세션에 role 주입
```

#### **문제점**
1. **단일 인증 엔드포인트의 이중 책임**
   - 일반 사용자와 관리자 인증을 하나의 `authorize()` 함수에서 처리
   - User → Admin 순차 조회로 불필요한 DB 쿼리 발생
   - 인증 실패 시 어떤 테이블에서 실패했는지 추적 어려움

2. **Role 기반 분기의 불명확성**
   - `role: "user"` vs `role: "super" | "designer" | "operator"`
   - 클라이언트 레이아웃에서 role 체크 중복 (user layout, admin layout 각각)

3. **signIn 페이지 설정 모호**
   ```typescript
   pages: { signIn: "/login" }
   ```
   - 관리자 로그인(`/admin/login`)과 무관하게 `/login`으로 설정됨
   - 인증 실패 시 관리자도 `/login`으로 리다이렉트될 위험

---

### 1.2 레이아웃 구조 (Layout Architecture)

#### **현재 구조**
```
app/
├── layout.tsx (Root)
├── dashboard/
│   └── layout.tsx (Client-side auth check)
│       └── useSession() → role !== "admin" 체크
└── admin/
    ├── login/page.tsx
    └── (dashboard)/
        └── layout.tsx (Client-side auth check)
            └── useSession() → role in ["super", "designer", "operator"] 체크
```

#### **문제점**

1. **클라이언트 사이드 인증의 보안 취약성**
   - 모든 레이아웃이 `"use client"` → 서버 사이드 검증 부재
   - useSession()으로 인증 체크 → 초기 렌더링 시 깜빡임 (FOUC)
   - 인증 실패 시 `return null` → SEO 및 접근성 문제

2. **중복된 인증 로직**
   ```typescript
   // dashboard/layout.tsx (일반 사용자)
   if (status === "unauthenticated") router.push("/")
   if (role === "admin") router.push("/admin")

   // admin/(dashboard)/layout.tsx (관리자)
   if (status === "unauthenticated") router.replace("/admin/login")
   if (!["super", "designer", "operator"].includes(role)) router.replace("/")
   ```
   - 같은 로직을 두 곳에서 반복
   - 인증 정책 변경 시 여러 파일 수정 필요

3. **레이아웃 네이밍 혼란**
   - `admin/(dashboard)/layout.tsx` → 괄호 그룹 사용 이유 불명확
   - 삭제된 `app/(admin)/layout.tsx`와의 충돌 발생 이력

---

### 1.3 UI 상태 관리 (Form State)

#### **자료 제출 페이지 분석**

**기존 로직** (수정 전):
```typescript
// 섹션별 수정 상태
const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
const [isEditingLogo, setIsEditingLogo] = useState(false);
const [isEditingNamecard, setIsEditingNamecard] = useState(false);

// 저장 버튼 표시 조건
{isEditingBasicInfo && <Button>저장하기</Button>}
```

**문제점**:
1. **초기 상태 불일치**
   - 모든 `isEditing*` 상태가 `false`로 초기화
   - "수정하기" 버튼을 클릭해야 저장 버튼 표시
   - **사용자 혼란**: 입력 후 저장 방법을 찾지 못함

2. **불필요한 UI 단계**
   ```
   입력 → 수정하기 클릭 → 저장하기 버튼 표시 → 저장
   ```
   올바른 플로우:
   ```
   입력 → 저장
   ```

3. **제출 완료 상태와 연결 부재**
   - `submission.isComplete`가 true여도 수정 모드 진입 가능
   - 입력 필드 disabled 조건 혼란

---

### 1.4 데이터베이스 연결점 (DB Schema & Relations)

#### **User ↔ Submission ↔ Workflow 관계**

```prisma
User (일반 사용자)
├── submission: Submission? (1:1)
└── workflows: Workflow[] (1:N)

Admin (관리자)
└── (독립적, User와 무관)
```

#### **데이터 흐름**
```
[사용자] → Submission.isComplete = true
         ↓
[시스템] → Workflow 자동 생성 (명함, 명찰, 대봉투, 자문계약서)
         ↓
[관리자] → 시안 업로드 (Workflow.시안URL)
         ↓
[사용자] → 시안 확인 → 발주 승인
         ↓
[관리자] → 제작 완료 → 택배 발송
```

#### **문제점**

1. **사용자-관리자 연결 포인트 미비**
   - 사용자가 "인쇄물 제작요청"을 했는지 관리자가 알 수 없음
   - Workflow 생성 트리거: API 호출 시점 불명확
   - **누락 케이스**: `isComplete = true`인데 Workflow가 없는 경우

2. **홈페이지 스타일 필드 타입 불일치**
   ```prisma
   model Submission {
     홈페이지컬러컨셉 String? // ✅ 존재
     홈페이지스타일   ???     // ❌ 스키마에 없음
   }
   ```
   - 클라이언트에서 `홈페이지스타일` 입력 → DB 저장 실패

3. **시안 예정일 계산 로직 부재**
   ```prisma
   시안예정일 DateTime?
   ```
   - 어디서 계산하는지 불명확
   - 평일 3일 후 계산 로직 누락 가능

---

## 2. 근본 원인 진단

### 2.1 설계 원칙 부재

| 문제 영역 | 근본 원인 | 영향 |
|----------|----------|------|
| **인증 시스템** | Single Responsibility 위반 | 하나의 함수가 User/Admin 모두 처리 → 복잡도 증가 |
| **레이아웃** | DRY 원칙 위반 | 인증 체크 로직 중복 → 유지보수 비용 증가 |
| **UI 상태** | User Intent 무시 | "수정하기" 버튼 강제 → 사용자 경험 저하 |
| **DB 스키마** | 스키마-코드 불일치 | `홈페이지스타일` 필드 누락 → 런타임 에러 |

### 2.2 문제의 연쇄 효과

```
[Root Cause] 클라이언트 사이드 인증
      ↓
[Effect 1] useSession() 중복 호출
      ↓
[Effect 2] 초기 렌더링 지연 (loading 상태)
      ↓
[Effect 3] 깜빡임 (FOUC)
      ↓
[Impact] 사용자 경험 저하 + SEO 문제
```

---

## 3. 아키텍처 재설계

### 3.1 인증 시스템 분리 (Authentication Separation)

#### **설계 원칙**
> "하나의 인증 엔드포인트는 하나의 사용자 타입만 처리한다"

#### **새로운 구조**

```typescript
// lib/auth/user-auth.ts
export const userAuthProvider = Credentials({
  id: "user-credentials",
  name: "User Login",
  async authorize(credentials) {
    const { emailOrPhone, password } = credentials;

    // 전화번호 체크
    if (isPhoneNumber(emailOrPhone)) {
      return await authenticateUserByPhone(emailOrPhone, password);
    }

    // 이메일 체크
    return await authenticateUserByEmail(emailOrPhone, password);
  }
});

// lib/auth/admin-auth.ts
export const adminAuthProvider = Credentials({
  id: "admin-credentials",
  name: "Admin Login",
  async authorize(credentials) {
    const { email, password } = credentials;
    return await authenticateAdmin(email, password);
  }
});

// auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [userAuthProvider, adminAuthProvider],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.userType = account.provider; // "user-credentials" | "admin-credentials"
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.cohortId = user.cohortId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.userType = token.userType; // ✅ 사용자 타입 명시
      session.user.cohortId = token.cohortId;
      return session;
    },
  },
  pages: {
    signIn: "/login", // 일반 사용자 기본값
  },
});
```

#### **로그인 페이지 수정**

```typescript
// app/login/page.tsx (일반 사용자)
await signIn("user-credentials", {
  emailOrPhone,
  password,
  redirect: false,
});

// app/admin/login/page.tsx (관리자)
await signIn("admin-credentials", {
  email,
  password,
  redirect: false,
});
```

#### **장점**
1. ✅ Provider ID로 사용자 타입 명확히 구분
2. ✅ User/Admin 인증 로직 완전 분리
3. ✅ 인증 실패 추적 용이 (어느 provider에서 실패했는지 명확)
4. ✅ 향후 OAuth 추가 시 확장 가능

---

### 3.2 서버 컴포넌트 기반 인증 (Server-side Auth)

#### **설계 원칙**
> "인증은 서버에서, UI는 클라이언트에서"

#### **새로운 레이아웃 구조**

```
app/
├── layout.tsx (Root - RSC)
├── (user)/                        ← 그룹 라우트 (일반 사용자)
│   ├── layout.tsx (RSC - 서버 인증)
│   ├── login/page.tsx
│   └── dashboard/
│       ├── layout.tsx (Client - UI만)
│       ├── page.tsx
│       ├── submission/page.tsx
│       └── workflows/page.tsx
└── (admin)/                       ← 그룹 라우트 (관리자)
    ├── layout.tsx (RSC - 서버 인증)
    ├── admin/
    │   ├── login/page.tsx
    │   └── dashboard/
    │       ├── layout.tsx (Client - UI만)
    │       ├── page.tsx
    │       ├── users/page.tsx
    │       └── workflows/page.tsx
```

#### **서버 인증 레이아웃 구현**

```typescript
// app/(user)/layout.tsx (Server Component)
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function UserAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 미인증
  if (!session) {
    redirect("/login");
  }

  // 관리자가 일반 사용자 영역 접근 시도
  if (session.user.userType === "admin-credentials") {
    redirect("/admin");
  }

  return <>{children}</>;
}

// app/(admin)/layout.tsx (Server Component)
export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 미인증
  if (!session) {
    redirect("/admin/login");
  }

  // 일반 사용자가 관리자 영역 접근 시도
  if (session.user.userType !== "admin-credentials") {
    redirect("/");
  }

  // 권한 체크 (super, designer, operator만 허용)
  const allowedRoles = ["super", "designer", "operator"];
  if (!allowedRoles.includes(session.user.role)) {
    redirect("/admin/login?error=unauthorized");
  }

  return <>{children}</>;
}
```

#### **클라이언트 UI 레이아웃**

```typescript
// app/(user)/dashboard/layout.tsx (Client Component)
"use client";

import { useSession } from "next-auth/react";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  // ✅ 인증은 이미 서버에서 완료
  // ✅ 여기서는 UI 렌더링만 담당

  return (
    <div>
      <Header userName={session?.user?.name} />
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

#### **장점**
1. ✅ 서버에서 인증 완료 → 클라이언트 초기 렌더링 깨끗함
2. ✅ FOUC (깜빡임) 완전 제거
3. ✅ SEO 최적화 (인증 실패 시 즉시 리다이렉트)
4. ✅ 클라이언트 번들 크기 감소 (인증 로직 서버로 이동)
5. ✅ 보안 강화 (클라이언트에서 role 조작 불가)

---

### 3.3 미들웨어 도입 (Middleware for Path Protection)

#### **설계 원칙**
> "경로 보호는 미들웨어에서, 세부 권한은 레이아웃에서"

#### **middleware.ts**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // === 1. 공개 경로 (인증 불필요) ===
  const publicPaths = ["/", "/login", "/signup", "/admin/login", "/admin/register"];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // === 2. 미인증 사용자 리다이렉트 ===
  if (!session) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // === 3. 경로-사용자 타입 매칭 검증 ===
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminUser = session.user.userType === "admin-credentials";

  if (isAdminPath && !isAdminUser) {
    // 일반 사용자가 관리자 영역 접근 시도
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAdminPath && isAdminUser) {
    // 관리자가 일반 사용자 영역 접근 시도
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 보호할 경로
    "/dashboard/:path*",
    "/admin/:path*",
    // 제외: api, _next/static, _next/image, favicon.ico
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

#### **장점**
1. ✅ 모든 요청을 Edge에서 먼저 검증 (빠른 속도)
2. ✅ 레이아웃 진입 전 차단 → 불필요한 렌더링 방지
3. ✅ 중앙 집중식 경로 보호 → 유지보수 용이
4. ✅ 로그 추적 용이 (미들웨어에서 인증 실패 로그 기록)

---

## 4. UI/UX 로직 표준화

### 4.1 Form State 관리 원칙

#### **설계 원칙**
> "사용자는 언제든 입력하고 저장할 수 있어야 한다"

#### **기존 문제**
```typescript
// ❌ 나쁜 예
const [isEditing, setIsEditing] = useState(false);

return (
  <form>
    <Input disabled={!isEditing} />
    {isEditing && <Button>저장</Button>}
  </form>
);
```
**문제**: 수정 모드 진입 필요 → 불필요한 UI 단계

#### **개선안**
```typescript
// ✅ 좋은 예
return (
  <form>
    <Input disabled={submission?.isComplete} />
    {!submission?.isComplete && <Button>저장</Button>}
  </form>
);
```
**장점**:
- 제출 완료 전까지 항상 수정 가능
- "수정하기" 버튼 불필요
- 사용자 의도에 맞는 직관적 UX

---

### 4.2 제출 완료 상태 관리

#### **상태 다이어그램**

```
[작성 중] isComplete = false
    ↓ (사용자: "인쇄물 제작요청" 버튼 클릭)
[제출 완료] isComplete = true
    ↓ (시스템: Workflow 4개 자동 생성)
[진행 중] workflows.length > 0
    ↓ (관리자: 시안 업로드)
[시안 확인 대기] workflow.status = "발주대기"
    ↓ (사용자: 발주 승인)
[제작 진행] workflow.status = "발주완료"
```

#### **UI 상태 매핑**

| 상태 | isComplete | workflows.length | UI 표시 |
|------|-----------|------------------|---------|
| 작성 중 | false | 0 | ✅ 모든 입력 필드 활성화, 저장 버튼 표시 |
| 제출 완료 | true | > 0 | ❌ 입력 필드 비활성화, 저장 버튼 숨김 |
| 수정 요청 | true | > 0, 수정횟수 < 2 | ⚠️ 특정 필드만 활성화 (추후 기능) |

#### **구현**

```typescript
// app/dashboard/submission/page.tsx

// ✅ 제출 완료 여부로 모든 UI 제어
const isSubmitted = submission?.isComplete ?? false;

return (
  <>
    {/* 제출 완료 안내 */}
    {isSubmitted && (
      <Alert variant="success">
        제출하신 자료는 수정할 수 없습니다.
        시안은 {submission.시안예정일}에 전달 예정입니다.
      </Alert>
    )}

    <form onSubmit={handleSave}>
      {/* 입력 필드 */}
      <Input
        name="브랜드명"
        defaultValue={submission?.브랜드명}
        disabled={isSubmitted}
      />

      {/* 저장 버튼 */}
      {!isSubmitted && (
        <Button type="submit">저장하기</Button>
      )}
    </form>

    {/* 제작 요청 버튼 */}
    {!isSubmitted && completionRate === 100 && (
      <Button onClick={handlePrintRequest}>
        인쇄물 제작요청
      </Button>
    )}
  </>
);
```

---

### 4.3 사용자-관리자 연결 포인트

#### **핵심 이슈**
> "사용자가 제작요청을 했는지 관리자가 어떻게 알 수 있는가?"

#### **현재 상황**
```
[사용자] 제작요청 버튼 클릭
    ↓
[API] /api/submission → { isComplete: true }
    ↓
[시스템] ??? (Workflow 생성 타이밍 불명확)
    ↓
[관리자] 어떻게 알아채는가?
```

#### **문제점**
1. Workflow 생성 로직이 API 라우트에 없음
2. 관리자 대시보드에 "신규 제작요청" 알림 없음
3. 텔레그램 알림만 의존 → 알림 실패 시 누락

---

#### **개선안 1: API에서 Workflow 자동 생성**

```typescript
// app/api/submission/request-print/route.ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return unauthorized();

  const userId = session.user.id;

  // 1. 제출 완료 처리
  const submission = await prisma.submission.update({
    where: { userId },
    data: {
      isComplete: true,
      completedAt: new Date(),
      시안예정일: calculateBusinessDays(3), // 평일 3일 후
    },
  });

  // 2. 워크플로우 4개 자동 생성
  const workflowTypes = ["명함", "명찰", "대봉투", "자문계약서"];
  await prisma.workflow.createMany({
    data: workflowTypes.map(type => ({
      userId,
      type,
      status: "대기",
      자료제출일: new Date(),
    })),
  });

  // 3. 관리자 알림 (텔레그램)
  await sendTelegramNotification({
    chatId: process.env.ADMIN_TELEGRAM_CHAT_ID,
    message: `🚨 신규 제작요청\n\n사용자: ${session.user.name}\n브랜드명: ${submission.브랜드명}`,
  });

  // 4. 사용자 알림 (SMS)
  await sendSMS({
    to: session.user.phone,
    message: `자료 제출이 완료되었습니다. 시안은 ${formatDate(submission.시안예정일)}에 전달 예정입니다.`,
  });

  return NextResponse.json({ success: true, submission });
}
```

#### **개선안 2: 관리자 대시보드에 실시간 알림**

```typescript
// app/admin/(dashboard)/page.tsx

export default async function AdminDashboard() {
  // 신규 제작요청 (workflow가 "대기" 상태인 사용자)
  const pendingRequests = await prisma.user.findMany({
    where: {
      workflows: {
        some: {
          status: "대기",
        },
      },
    },
    include: {
      submission: true,
      workflows: true,
    },
  });

  return (
    <div>
      {/* 🔔 신규 제작요청 알림 */}
      {pendingRequests.length > 0 && (
        <Alert variant="warning">
          <Bell className="w-5 h-5" />
          <strong>{pendingRequests.length}건</strong>의 신규 제작요청이 있습니다.
        </Alert>
      )}

      {/* 제작요청 목록 */}
      <Table>
        {pendingRequests.map(user => (
          <TableRow key={user.id}>
            <TableCell>{user.이름}</TableCell>
            <TableCell>{user.submission?.브랜드명}</TableCell>
            <TableCell>{user.workflows.length}개 인쇄물</TableCell>
            <TableCell>
              <Button onClick={() => router.push(`/admin/users/${user.id}`)}>
                자료 확인
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

---

## 5. 유지보수 최적화 방안

### 5.1 타입 안전성 (Type Safety)

#### **문제: `(session.user as any).role` 남발**

```typescript
// ❌ 현재 코드
const userRole = (session.user as any).role;
```

#### **해결: 타입 확장**

```typescript
// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: "user" | "super" | "designer" | "operator";
    userType: "user-credentials" | "admin-credentials";
    cohortId?: string;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    userType: string;
    cohortId?: string;
  }
}
```

```typescript
// ✅ 타입 안전한 코드
const session = await auth();
const userRole = session.user.role; // ✅ 타입 추론 완벽
```

---

### 5.2 환경별 설정 관리

```typescript
// lib/config.ts
export const config = {
  auth: {
    providers: {
      user: "user-credentials",
      admin: "admin-credentials",
    },
    pages: {
      userSignIn: "/login",
      adminSignIn: "/admin/login",
    },
  },
  roles: {
    admin: ["super", "designer", "operator"] as const,
  },
  workflow: {
    types: ["명함", "명찰", "대봉투", "자문계약서"] as const,
    statuses: ["대기", "시안중", "발주대기", "발주완료", "제작완료", "발송완료"] as const,
  },
} as const;

// 사용 예
import { config } from "@/lib/config";

if (config.roles.admin.includes(session.user.role)) {
  // 관리자 권한 필요
}
```

---

### 5.3 공통 Hook 추출

```typescript
// hooks/use-auth-redirect.ts
export function useAuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  return { session, status };
}

// 사용
const { session } = useAuthRedirect();
```

---

### 5.4 DB 스키마 정합성 검증

#### **문제: 클라이언트 필드가 DB에 없음**

```typescript
// app/dashboard/submission/page.tsx
<Input name="홈페이지스타일" /> // ❌ DB에 없는 필드
```

#### **해결 1: 스키마 추가**

```prisma
model Submission {
  // ...
  홈페이지스타일   String? // ✅ 추가
  홈페이지컬러컨셉 String?
}
```

#### **해결 2: 타입 기반 폼 검증**

```typescript
// lib/submission-schema.ts
import { z } from "zod";

export const submissionSchema = z.object({
  브랜드명: z.string().min(1, "브랜드명을 입력해주세요"),
  업종: z.string().min(1, "업종을 입력해주세요"),
  주소: z.string().min(1, "주소를 입력해주세요"),
  홈페이지스타일: z.string().optional(),
  홈페이지컬러컨셉: z.string().optional(),
});

// API에서 사용
const data = submissionSchema.parse(req.body);
```

---

## 6. 구현 로드맵

### Phase 1: 기반 구조 개선 (1주)

- [ ] **타입 정의** (`types/next-auth.d.ts`)
- [ ] **인증 Provider 분리** (`lib/auth/user-auth.ts`, `lib/auth/admin-auth.ts`)
- [ ] **미들웨어 구현** (`middleware.ts`)
- [ ] **DB 스키마 수정** (`홈페이지스타일` 필드 추가)

### Phase 2: 레이아웃 재구조화 (3일)

- [ ] **서버 인증 레이아웃** (`app/(user)/layout.tsx`, `app/(admin)/layout.tsx`)
- [ ] **클라이언트 UI 레이아웃** (기존 레이아웃을 UI 전용으로 전환)
- [ ] **경로 재구성** (그룹 라우트 정리)

### Phase 3: UI 로직 표준화 (3일)

- [ ] **자료 제출 페이지** (`isEditing` 상태 제거, `isComplete` 기반 UI)
- [ ] **제작 요청 API** (Workflow 자동 생성 로직 추가)
- [ ] **관리자 대시보드** (신규 제작요청 알림 추가)

### Phase 4: 유지보수 최적화 (2일)

- [ ] **환경 설정 중앙화** (`lib/config.ts`)
- [ ] **공통 Hook 추출** (`use-auth-redirect.ts`)
- [ ] **Zod 스키마 검증** (모든 API 라우트에 적용)

### Phase 5: 테스트 & 검수 (3일)

- [ ] **단위 테스트** (인증, API)
- [ ] **E2E 테스트** (로그인, 자료 제출, 워크플로우)
- [ ] **검수 체크리스트** (아래 섹션 참조)

---

## 7. 검수 체크리스트

### 7.1 인증 시스템

- [ ] 일반 사용자 로그인 (`/login`) → `/dashboard`로 리다이렉트
- [ ] 관리자 로그인 (`/admin/login`) → `/admin`으로 리다이렉트
- [ ] 일반 사용자가 `/admin` 접근 시도 → `/dashboard`로 리다이렉트
- [ ] 관리자가 `/dashboard` 접근 시도 → `/admin`으로 리다이렉트
- [ ] 미인증 사용자가 보호 경로 접근 → 로그인 페이지로 리다이렉트
- [ ] `session.user.userType` 정확히 설정됨 (`user-credentials` | `admin-credentials`)

### 7.2 레이아웃 & 경로

- [ ] 초기 렌더링 시 깜빡임(FOUC) 없음
- [ ] 서버 컴포넌트 레이아웃에서 인증 체크 완료
- [ ] 클라이언트 레이아웃은 UI만 렌더링
- [ ] 미들웨어에서 잘못된 경로 접근 차단
- [ ] 로딩 상태 최소화 (서버 인증으로 즉시 리다이렉트)

### 7.3 UI/UX

- [ ] 자료 제출 페이지: 저장 버튼이 항상 보임 (`isComplete = false`일 때)
- [ ] 자료 제출 페이지: 제출 완료 후 모든 입력 필드 비활성화
- [ ] "수정하기" 버튼 없음 (불필요한 UI 단계 제거)
- [ ] 제작 요청 버튼: 완성도 100%일 때만 활성화
- [ ] 제작 요청 후: Workflow 4개 자동 생성 확인

### 7.4 사용자-관리자 연결 포인트

- [ ] 사용자가 "인쇄물 제작요청" 클릭 → `Submission.isComplete = true`
- [ ] 동시에 `Workflow` 4개 자동 생성 (명함, 명찰, 대봉투, 자문계약서)
- [ ] 관리자 대시보드에 신규 제작요청 알림 표시
- [ ] 텔레그램 알림 발송 (관리자)
- [ ] SMS 알림 발송 (사용자)

### 7.5 데이터베이스

- [ ] `홈페이지스타일` 필드 추가됨 (Prisma 마이그레이션 완료)
- [ ] 클라이언트에서 제출한 모든 필드가 DB에 저장됨
- [ ] `시안예정일` 자동 계산 (평일 3일 후)
- [ ] Workflow 생성 시 `자료제출일` 자동 설정

### 7.6 타입 안전성

- [ ] `session.user.role` 타입 추론 완벽
- [ ] `(session.user as any)` 사용하지 않음
- [ ] Zod 스키마로 API 요청 검증
- [ ] TypeScript 컴파일 에러 없음

### 7.7 유지보수성

- [ ] 인증 체크 로직 중복 없음 (미들웨어/서버 레이아웃만)
- [ ] 환경 설정 중앙화 (`lib/config.ts`)
- [ ] 공통 Hook 추출 완료
- [ ] 코드 리뷰 완료 (임시방편 없음 확인)

---

## 8. 결론

### 8.1 개선 전후 비교

| 항목 | 개선 전 | 개선 후 |
|-----|--------|--------|
| **인증 복잡도** | 하나의 함수에서 User/Admin 모두 처리 | Provider 분리 → 단순화 |
| **레이아웃 렌더링** | 클라이언트에서 인증 체크 → 깜빡임 | 서버 인증 → 깨끗한 렌더링 |
| **UI 단계** | 입력 → 수정하기 → 저장 | 입력 → 저장 |
| **사용자-관리자 연결** | 수동 확인 필요 | 자동 알림 + 대시보드 표시 |
| **타입 안전성** | `(session.user as any)` 남발 | 완벽한 타입 추론 |
| **유지보수** | 중복 로직, 임시방편 산재 | 중앙 집중화, DRY 준수 |

### 8.2 핵심 원칙

1. **분리**: 사용자 타입별 인증 로직 분리
2. **서버 우선**: 인증은 서버에서, UI는 클라이언트에서
3. **사용자 중심**: 불필요한 UI 단계 제거
4. **자동화**: Workflow 생성, 알림 발송 자동화
5. **타입 안전**: TypeScript로 런타임 에러 방지
6. **중앙 집중**: 설정, 로직 중복 제거

### 8.3 향후 확장 가능성

- OAuth 로그인 추가 (Google, Naver)
- 역할 기반 권한 세분화 (RBAC)
- 실시간 알림 (WebSocket, Server-Sent Events)
- 수정 횟수 제한 & 추가 비용 청구 자동화
- 다국어 지원 (i18n)

---

**작성자**: Claude Code
**검토**: [담당자명]
**승인**: [승인자명]
**최종 수정일**: 2025-01-XX
