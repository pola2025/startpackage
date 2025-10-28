# 수료생 전용 서비스 기획서

**프로젝트명:** 비즈액터스쿨 수료생 포털
**도메인:** alumni.polaai.co.kr
**작성일:** 2025-10-28
**버전:** 1.0.0

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [배경 및 목적](#배경-및-목적)
3. [서비스 범위](#서비스-범위)
4. [사용자 시나리오](#사용자-시나리오)
5. [기술 스택](#기술-스택)
6. [시스템 아키텍처](#시스템-아키텍처)
7. [데이터베이스 설계](#데이터베이스-설계)
8. [UI/UX 설계](#uiux-설계)
9. [개발 일정](#개발-일정)
10. [체크리스트](#체크리스트)

---

## 프로젝트 개요

### 목표
비즈액터스쿨 수료생을 위한 **독립적이고 간결한 포털** 구축

### 핵심 가치
- **간결함**: 수료생에게 필요한 기능만 제공 (커뮤니케이션, 마케팅 소식)
- **명확한 정체성**: 로그인부터 "수료생 전용" 경험 제공
- **성능**: 가벼운 번들 크기로 빠른 로딩 속도
- **독립성**: 현재 수강생 시스템과 완전 분리

---

## 배경 및 목적

### 현재 문제점

#### 1. 불필요한 UI 노출
```
[현재 상황]
수료생 로그인 → 대시보드 진입
  ├── ✅ 커뮤니케이션 (필요)
  ├── ✅ 마케팅 소식 (필요)
  ├── ❌ 워크플로우 (불필요)
  ├── ❌ 자료 제출 (불필요)
  └── ❌ 대시보드 통계 (불필요)

[문제점]
- 수료생이 혼란스러움 ("이거 아직 써야 해?")
- 불필요한 메뉴 클릭 유도
- UI가 복잡함
```

#### 2. 성능 문제
- 현재 수강생 앱 번들에 모든 코드 포함
- 수료생은 2개 기능만 사용하는데 전체 앱 로드
- 초기 로딩 시간 불필요하게 김

#### 3. 심리적 구분 부족
- 수료생도 현재 수강생과 같은 로그인 화면
- "졸업했다"는 느낌 부족
- 수료생 전용 서비스라는 인식 부족

### 해결 방안

#### 서브도메인 분리
```
polaai.co.kr              → 현재 수강생 전용
alumni.polaai.co.kr       → 수료생 전용 (NEW)
admin.polaai.co.kr        → 관리자 전용
```

#### 기대 효과
- ✅ 수료생 전용 브랜딩 및 UX
- ✅ 번들 크기 70% 감소 (500KB → 150KB)
- ✅ 명확한 서비스 구분
- ✅ 독립적인 배포 및 업데이트

---

## 서비스 범위

### 포함 기능 ✅

#### 1. 로그인 시스템
- 수료생 전용 로그인 페이지
- 수료생(`status: graduated`) 사용자만 접근 가능
- 별도 세션 쿠키 (`alumni.session`)

#### 2. 대시보드
- 간결한 메인 화면
- 2개 서비스 카드 (커뮤니케이션, 마케팅 소식)
- 최근 활동 타임라인
- 프로필 정보

#### 3. 커뮤니케이션
- 관리자와 1:1 메시지
- 스레드 목록 조회
- 메시지 읽기/쓰기
- 실시간 알림

#### 4. 마케팅 소식
- 공지사항 목록
- 마케팅 정보 확인
- 읽음 상태 표시

### 제외 기능 ❌

- ❌ 워크플로우 시스템
- ❌ 자료 제출
- ❌ 기수 정보
- ❌ 통계 대시보드
- ❌ 파일 업로드

---

## 사용자 시나리오

### 시나리오 1: 수료생 첫 로그인

```
1. 수료생 A가 alumni.polaai.co.kr 접속
   ↓
2. 수료생 전용 로그인 화면 표시
   - "수료생 로그인" 타이틀
   - 졸업모자 아이콘
   - "비즈액터스쿨 수료생 전용 페이지입니다" 안내
   ↓
3. 이메일/비밀번호 입력
   ↓
4. DB에서 status 확인
   - status === "graduated" → 로그인 성공
   - status !== "graduated" → "수료생만 로그인할 수 있습니다" 에러
   ↓
5. 대시보드 진입
   - "환영합니다, OOO 수료생님" 인사
   - 2개 카드: 커뮤니케이션, 마케팅 소식
   - 최근 활동 타임라인
```

### 시나리오 2: 관리자와 메시지 주고받기

```
1. 대시보드에서 "커뮤니케이션" 카드 클릭
   ↓
2. 커뮤니케이션 페이지 진입
   - 기존 스레드 목록 표시
   - 새 대화 시작 버튼
   ↓
3. 스레드 선택 또는 새 대화 시작
   ↓
4. 메시지 작성 및 전송
   ↓
5. 관리자 응답 시 실시간 알림
```

### 시나리오 3: 마케팅 소식 확인

```
1. 대시보드에서 "마케팅 소식" 카드 클릭
   ↓
2. 공지사항 목록 조회
   - 최신 순 정렬
   - 읽음/안읽음 표시
   ↓
3. 공지사항 선택
   ↓
4. 내용 확인
   ↓
5. 읽음 처리 (자동)
```

### 시나리오 4: 현재 수강생이 수료생 URL 접속 시도

```
1. 현재 수강생 B가 alumni.polaai.co.kr 접속
   ↓
2. 로그인 시도
   ↓
3. DB에서 status 확인
   - status === "active" → 로그인 거부
   ↓
4. 에러 메시지 표시
   "수료생만 접근할 수 있습니다. polaai.co.kr로 이동해주세요."
   ↓
5. polaai.co.kr 링크 제공
```

---

## 기술 스택

### 프론트엔드
- **Framework**: Next.js 15.5.6
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (재활용)
- **Icons**: Lucide React

### 백엔드
- **API**: Next.js API Routes
- **Database**: PostgreSQL (기존 DB 공유)
- **ORM**: Prisma
- **Authentication**: NextAuth.js

### 인프라
- **Hosting**: Vercel
- **Domain**: alumni.polaai.co.kr (서브도메인)
- **Monorepo**: Turborepo

---

## 시스템 아키텍처

### 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                   사용자 접속                         │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  현재 수강생  │ │   수료생     │ │   관리자     │
│ polaai.co.kr │ │ alumni.      │ │ admin.       │
│              │ │ polaai.co.kr │ │ polaai.co.kr │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  PostgreSQL DB  │
              │  (공용)         │
              └─────────────────┘
```

### Monorepo 구조

```
startpackage/
├── apps/
│   ├── student/              # polaai.co.kr
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── workflows/
│   │   │   ├── submission/
│   │   │   ├── communication/
│   │   │   └── announcements/
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── auth.ts       # 현재 수강생 인증
│   │   └── package.json
│   │
│   ├── alumni/               # alumni.polaai.co.kr (NEW)
│   │   ├── app/
│   │   │   ├── login/
│   │   │   │   └── page.tsx  # 수료생 로그인
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx  # 수료생 대시보드
│   │   │   ├── communication/
│   │   │   │   └── page.tsx  # 커뮤니케이션
│   │   │   ├── announcements/
│   │   │   │   └── page.tsx  # 마케팅 소식
│   │   │   └── api/
│   │   │       └── auth/
│   │   │           └── [...nextauth]/
│   │   │               └── route.ts
│   │   ├── components/
│   │   │   ├── AlumniHeader.tsx
│   │   │   ├── AlumniNav.tsx
│   │   │   └── ServiceCard.tsx
│   │   ├── lib/
│   │   │   └── auth.ts       # 수료생 인증
│   │   └── package.json
│   │
│   └── admin/                # admin.polaai.co.kr
│       └── ...
│
├── packages/
│   ├── ui/                   # 공용 UI 컴포넌트
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   └── package.json
│   │
│   ├── database/             # Prisma 스키마
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   └── shared/               # 공용 유틸리티
│       ├── lib/
│       │   ├── utils.ts
│       │   ├── format.ts
│       │   └── validation.ts
│       └── package.json
│
├── turbo.json
├── package.json
└── .gitignore
```

---

## 데이터베이스 설계

### 기존 스키마 수정

#### User 모델 확장

```prisma
model User {
  id              String      @id @default(cuid())
  email           String      @unique
  name            String
  phone           String?
  password        String

  // 수료생 구분 필드 (추가)
  status          UserStatus  @default(active)
  graduatedAt     DateTime?   // 수료일

  cohortId        String?
  cohort          Cohort?     @relation(fields: [cohortId], references: [id])

  submissions     Submission[]
  threads         Thread[]
  messages        Message[]
  readAnnouncements ReadAnnouncement[]

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum UserStatus {
  active      // 현재 수강생
  graduated   // 수료생
  inactive    // 비활성 (탈퇴, 휴학 등)
}
```

### 마이그레이션 SQL

```sql
-- 1. UserStatus enum 생성
CREATE TYPE "UserStatus" AS ENUM ('active', 'graduated', 'inactive');

-- 2. User 테이블에 컬럼 추가
ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "graduatedAt" TIMESTAMP(3);

-- 3. 기존 사용자 모두 active로 설정 (이미 default)
-- (이미 default로 active이므로 별도 작업 불필요)

-- 4. 수료생 수동 설정 예시
UPDATE "User"
SET
  "status" = 'graduated',
  "graduatedAt" = NOW()
WHERE email IN (
  'graduated1@example.com',
  'graduated2@example.com'
);
```

### 데이터 접근 패턴

#### 현재 수강생 조회 (apps/student)
```typescript
const activeStudents = await prisma.user.findMany({
  where: { status: "active" }
})
```

#### 수료생 조회 (apps/alumni)
```typescript
const alumni = await prisma.user.findMany({
  where: { status: "graduated" }
})
```

#### 수료생 로그인 검증
```typescript
const user = await prisma.user.findUnique({
  where: {
    email: credentials.email,
    status: "graduated"  // 수료생만
  }
})

if (!user) {
  throw new Error("수료생만 로그인할 수 있습니다.")
}
```

---

## UI/UX 설계

### 디자인 컨셉

#### 색상 팔레트

**수료생 전용 브랜딩**
```css
/* 수료생 테마: 블루 계열 (차분하고 성숙한 느낌) */
--alumni-primary: #2563EB;      /* Blue 600 */
--alumni-primary-hover: #1D4ED8; /* Blue 700 */
--alumni-accent: #60A5FA;        /* Blue 400 */
--alumni-bg: #EFF6FF;            /* Blue 50 */
--alumni-border: #BFDBFE;        /* Blue 200 */

/* vs 현재 수강생 테마: 레드 계열 (활발하고 역동적인 느낌) */
--student-primary: #DC2626;      /* Red 600 */
```

#### 아이콘
- **메인 심볼**: 졸업모자 (GraduationCap)
- **커뮤니케이션**: MessageSquare
- **마케팅 소식**: Megaphone

---

### 화면 설계

#### 1. 로그인 페이지 (alumni.polaai.co.kr/login)

**와이어프레임:**
```
┌─────────────────────────────────────────┐
│                                         │
│         🎓 (GraduationCap Icon)         │
│                                         │
│          수료생 로그인                  │
│   비즈액터스쿨 수료생 전용 페이지입니다 │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 이메일                             │ │
│  │ [                              ]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 비밀번호                           │ │
│  │ [                              ]  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │         로그인                     │ │
│  └───────────────────────────────────┘ │
│                                         │
│    현재 수강생이신가요? → polaai.co.kr  │
│                                         │
└─────────────────────────────────────────┘
```

**구현 코드:**
```tsx
export default function AlumniLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-blue-200 shadow-lg">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <GraduationCap className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            수료생 로그인
          </h1>
          <p className="text-sm text-gray-600">
            비즈액터스쿨 수료생 전용 페이지입니다
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            로그인
          </Button>
        </form>

        {/* 안내 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            현재 수강생이신가요?{" "}
            <Link
              href="https://polaai.co.kr"
              className="text-blue-600 hover:underline"
            >
              일반 로그인으로 이동
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
```

---

#### 2. 대시보드 (alumni.polaai.co.kr/dashboard)

**와이어프레임:**
```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ 🎓 수료생 포털 | 환영합니다, OOO님 | [로그아웃] │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                                                 │
│  서비스                                         │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │ 💬               │  │ 📢               │   │
│  │ 커뮤니케이션     │  │ 마케팅 소식      │   │
│  │                  │  │                  │   │
│  │ 관리자와 메시지  │  │ 최신 소식 확인   │   │
│  │ 주고받기         │  │ 하기             │   │
│  └──────────────────┘  └──────────────────┘   │
│                                                 │
│  최근 활동                                      │
│  ┌───────────────────────────────────────────┐ │
│  │ 💬 관리자가 새 메시지 보냄 - 2시간 전     │ │
│  │ 📢 새로운 마케팅 소식 등록 - 1일 전       │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

**구현 코드:**
```tsx
const services = [
  {
    name: "커뮤니케이션",
    href: "/communication",
    icon: MessageSquare,
    description: "관리자와 메시지 주고받기",
    color: "blue"
  },
  {
    name: "마케팅 소식",
    href: "/announcements",
    icon: Megaphone,
    description: "최신 소식 확인하기",
    color: "indigo"
  }
]

export default function AlumniDashboard() {
  const { data: session } = useSession()
  const [recentActivities, setRecentActivities] = useState([])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AlumniHeader user={session?.user} />

      {/* Main Content */}
      <Container className="py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            환영합니다, {session?.user?.name}님
          </h1>
          <p className="text-gray-600">
            비즈액터스쿨 수료생 포털입니다
          </p>
        </div>

        {/* Services */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">서비스</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.name} service={service} />
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">최근 활동</h2>
          <Card>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))
              ) : (
                <EmptyState
                  title="최근 활동이 없습니다"
                  description="커뮤니케이션이나 마케팅 소식을 확인해보세요"
                />
              )}
            </div>
          </Card>
        </div>
      </Container>
    </div>
  )
}
```

---

#### 3. 커뮤니케이션 (alumni.polaai.co.kr/communication)

**재활용:**
- 기존 `app/dashboard/communication/page.tsx` 재사용
- UI는 동일하되, Header만 AlumniHeader로 교체

```tsx
import CommunicationPage from "@/components/communication/CommunicationPage"
import AlumniHeader from "@/components/AlumniHeader"

export default function AlumniCommunication() {
  return (
    <>
      <AlumniHeader />
      <CommunicationPage />
    </>
  )
}
```

---

#### 4. 마케팅 소식 (alumni.polaai.co.kr/announcements)

**재활용:**
- 기존 `app/dashboard/announcements/page.tsx` 재사용
- UI는 동일하되, Header만 AlumniHeader로 교체

```tsx
import AnnouncementsPage from "@/components/announcements/AnnouncementsPage"
import AlumniHeader from "@/components/AlumniHeader"

export default function AlumniAnnouncements() {
  return (
    <>
      <AlumniHeader />
      <AnnouncementsPage />
    </>
  )
}
```

---

### 공용 컴포넌트

#### AlumniHeader.tsx

```tsx
export function AlumniHeader({ user }: { user?: any }) {
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <Container>
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">수료생 포털</h1>
              <p className="text-xs text-gray-600">Alumni Portal</p>
            </div>
          </Link>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </div>
      </Container>
    </header>
  )
}
```

#### ServiceCard.tsx

```tsx
export function ServiceCard({ service }: { service: any }) {
  const Icon = service.icon

  return (
    <Link href={service.href}>
      <Card
        hover
        className="h-full border-blue-100 hover:border-blue-300 transition-all"
      >
        <div className="flex items-start gap-4 p-6">
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
            ${service.color === 'blue' ? 'bg-blue-100' : 'bg-indigo-100'}
          `}>
            <Icon className={`
              w-7 h-7
              ${service.color === 'blue' ? 'text-blue-600' : 'text-indigo-600'}
            `} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {service.name}
            </h3>
            <p className="text-sm text-gray-600">
              {service.description}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </Card>
    </Link>
  )
}
```

---

## 개발 일정

### 전체 일정: 7일

#### Week 1

##### Day 1: Monorepo 구조 설정
- [ ] Turborepo 초기화
- [ ] apps/student, apps/alumni, apps/admin 폴더 생성
- [ ] packages/ui, packages/database, packages/shared 생성
- [ ] turbo.json 설정
- [ ] 기존 코드 apps/student로 이동

##### Day 2: DB 스키마 마이그레이션
- [ ] Prisma 스키마에 UserStatus enum 추가
- [ ] User 모델에 status, graduatedAt 필드 추가
- [ ] 마이그레이션 실행
- [ ] 테스트 수료생 데이터 생성

##### Day 3-4: 수료생 앱 개발
- [ ] 로그인 페이지 구현
- [ ] 대시보드 구현
- [ ] AlumniHeader 컴포넌트
- [ ] ServiceCard 컴포넌트
- [ ] 인증 설정 (apps/alumni/lib/auth.ts)

##### Day 5: 커뮤니케이션 & 마케팅 소식 연동
- [ ] 기존 컴포넌트 packages/ui로 이동
- [ ] alumni 앱에서 재활용
- [ ] API 엔드포인트 테스트

##### Day 6: Vercel 배포
- [ ] alumni-app 프로젝트 생성
- [ ] 환경변수 설정
- [ ] 배포 테스트
- [ ] alumni.polaai.co.kr 도메인 연결

##### Day 7: 테스트 & 버그 수정
- [ ] 수료생 로그인 테스트
- [ ] 현재 수강생 접근 차단 테스트
- [ ] 커뮤니케이션 기능 테스트
- [ ] 마케팅 소식 기능 테스트
- [ ] 반응형 UI 테스트

---

## 체크리스트

### Phase 1: 프로젝트 설정
- [ ] Turborepo Monorepo 생성
- [ ] apps/alumni 폴더 구조 생성
- [ ] packages/ui 공용 컴포넌트 분리
- [ ] packages/database Prisma 설정
- [ ] turbo.json 빌드 파이프라인 설정

### Phase 2: 데이터베이스
- [ ] UserStatus enum 생성
- [ ] User 모델 확장 (status, graduatedAt)
- [ ] 마이그레이션 실행
- [ ] 테스트 데이터 생성 (수료생 2-3명)

### Phase 3: 인증 시스템
- [ ] apps/alumni/lib/auth.ts 생성
- [ ] 수료생 전용 로그인 로직 구현
- [ ] 세션 쿠키 분리 (alumni.session)
- [ ] 로그인 페이지 UI 구현

### Phase 4: UI 개발
- [ ] 로그인 페이지 (alumni.polaai.co.kr/login)
- [ ] 대시보드 (alumni.polaai.co.kr/dashboard)
- [ ] AlumniHeader 컴포넌트
- [ ] ServiceCard 컴포넌트
- [ ] 반응형 디자인 적용

### Phase 5: 기능 연동
- [ ] 커뮤니케이션 페이지 재활용
- [ ] 마케팅 소식 페이지 재활용
- [ ] API 엔드포인트 연결
- [ ] 실시간 알림 테스트

### Phase 6: 배포
- [ ] Vercel 프로젝트 생성 (alumni-app)
- [ ] 환경변수 설정 (DATABASE_URL, NEXTAUTH_SECRET 등)
- [ ] 빌드 테스트
- [ ] alumni.polaai.co.kr 도메인 연결
- [ ] SSL 인증서 확인

### Phase 7: 테스트
- [ ] 수료생 로그인 성공 테스트
- [ ] 현재 수강생 로그인 차단 테스트
- [ ] 커뮤니케이션 CRUD 테스트
- [ ] 마케팅 소식 읽기 테스트
- [ ] 모바일 반응형 테스트
- [ ] 크로스 브라우저 테스트

### Phase 8: 문서화
- [ ] README.md 작성 (수료생 앱 전용)
- [ ] API 문서 작성
- [ ] 배포 가이드 작성
- [ ] 사용자 매뉴얼 작성 (관리자용)

---

## 위험 요소 및 대응 방안

### 위험 1: 기존 사용자 데이터 마이그레이션 실패
**대응:**
- 마이그레이션 전 DB 백업
- 단계별 마이그레이션 (enum → 컬럼 추가 → 데이터 업데이트)
- Rollback 계획 수립

### 위험 2: 서브도메인 DNS 전파 지연
**대응:**
- 배포 1-2일 전에 미리 도메인 설정
- Vercel DNS 사용으로 전파 시간 최소화
- 테스트 도메인 활용

### 위험 3: 세션 쿠키 충돌
**대응:**
- 명확한 쿠키 이름 사용 (student.session vs alumni.session)
- domain 옵션 정확히 설정
- 로컬 테스트로 사전 검증

### 위험 4: 컴포넌트 재활용 시 의존성 문제
**대응:**
- packages/ui로 공용 컴포넌트 분리
- 명확한 props 인터페이스 정의
- Storybook으로 독립적 개발/테스트 (선택)

---

## 성공 지표

### 기술적 지표
- [ ] 수료생 앱 번들 크기 < 200KB
- [ ] 초기 로딩 시간 < 2초
- [ ] Lighthouse 성능 점수 > 90점
- [ ] 배포 성공률 100%

### 사용자 경험 지표
- [ ] 수료생 로그인 성공률 > 95%
- [ ] 평균 세션 시간 > 3분
- [ ] 커뮤니케이션 이용률 > 50%
- [ ] 사용자 만족도 > 4.5/5.0

### 비즈니스 지표
- [ ] 수료생 재방문율 증가
- [ ] 커뮤니케이션 응답률 향상
- [ ] 마케팅 소식 열람률 증가

---

## 향후 확장 가능성

### Phase 2 (추후 고려사항)

1. **수료생 전용 커뮤니티**
   - 수료생끼리 네트워킹
   - 정보 공유 게시판

2. **취업 지원 서비스**
   - 이력서 관리
   - 채용 공고 안내

3. **평생 교육 서비스**
   - 추가 강의 제공
   - 심화 과정 안내

4. **수료생 혜택**
   - 특별 할인
   - 이벤트 초대

---

## 참고 자료

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Turborepo Guide](https://turbo.build/repo/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Vercel Deployment Guide](https://vercel.com/docs)

---

**문서 버전:** 1.0.0
**최종 수정일:** 2025-10-28
**작성자:** Claude Code
**승인 대기 중**
