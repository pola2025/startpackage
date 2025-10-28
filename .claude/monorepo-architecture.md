# Monorepo 구조 설계

**프로젝트:** 비즈액터스쿨 멀티 서비스 아키텍처
**작성일:** 2025-10-28
**버전:** 1.0.0

---

## 목차

1. [전략 개요](#전략-개요)
2. [Phase 1: 안전한 분리 (권장)](#phase-1-안전한-분리-권장)
3. [Phase 2: 완전한 Monorepo (선택)](#phase-2-완전한-monorepo-선택)
4. [영향도 분석](#영향도-분석)
5. [마이그레이션 가이드](#마이그레이션-가이드)
6. [디렉토리 구조](#디렉토리-구조)
7. [체크리스트](#체크리스트)

---

## 전략 개요

### 핵심 원칙

**기존 서비스는 절대 건드리지 않음**

```
현재 운영 중:
polaai.co.kr → 현재 수강생 + 관리자 (계속 운영)

추가 예정:
alumni.polaai.co.kr → 수료생 전용 (새로 배포)
```

### 접근 방식

1. ✅ **Phase 1 (지금 진행)**: 수료생 앱을 별도 프로젝트로 개발
2. ⏸️ **Phase 2 (나중에)**: 필요하면 Monorepo로 통합

---

## Phase 1: 안전한 분리 (권장)

### 구조

```
F:\
├── startpackage\              ← 기존 프로젝트 (그대로 유지)
│   ├── app\
│   │   ├── (admin)\          ← 관리자 페이지
│   │   ├── dashboard\        ← 현재 수강생 페이지
│   │   ├── login\
│   │   ├── signup\
│   │   └── api\
│   ├── components\
│   ├── lib\
│   ├── prisma\
│   │   └── schema.prisma
│   ├── .env
│   ├── package.json
│   └── vercel.json
│
└── startpackage-alumni\       ← 새 프로젝트 (수료생 전용)
    ├── app\
    │   ├── login\
    │   │   └── page.tsx      # 수료생 로그인
    │   ├── dashboard\
    │   │   └── page.tsx      # 수료생 대시보드
    │   ├── communication\
    │   │   └── page.tsx      # 커뮤니케이션 (재활용)
    │   ├── announcements\
    │   │   └── page.tsx      # 마케팅 소식 (재활용)
    │   └── api\
    │       └── auth\
    │           └── [...nextauth]\
    │               └── route.ts
    ├── components\
    │   ├── AlumniHeader.tsx
    │   ├── ServiceCard.tsx
    │   └── ui\               # 기존 컴포넌트 복사
    │       ├── button.tsx
    │       ├── input.tsx
    │       └── card.tsx
    ├── lib\
    │   ├── auth.ts           # 수료생 인증
    │   ├── prisma.ts         # DB 연결 (같은 DB)
    │   └── utils.ts
    ├── prisma\
    │   └── schema.prisma     # 기존 스키마 복사
    ├── .env                  # 같은 DATABASE_URL
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── next.config.mjs
```

### 장점

| 항목 | 설명 |
|-----|------|
| **안전성** | 기존 서비스 100% 보존 |
| **개발 속도** | 수료생 앱만 집중 개발 |
| **배포 독립성** | 각자 독립적으로 배포 |
| **롤백 용이** | 문제 시 수료생 앱만 중단 |
| **학습 곡선** | Monorepo 도구 학습 불필요 |

### 단점

| 항목 | 설명 | 해결 방법 |
|-----|------|----------|
| **코드 중복** | UI 컴포넌트 복사 필요 | 복사/붙여넣기로 간단히 해결 |
| **DB 스키마 동기화** | Prisma 스키마 2곳 관리 | 수동 복사 (자주 변경 안 됨) |
| **일관성 유지** | 스타일 가이드 수동 적용 | 문서화로 해결 |

---

## Phase 2: 완전한 Monorepo (선택)

**나중에 필요하면 진행**

### Turborepo 구조

```
startpackage-monorepo\
├── apps\
│   ├── student\              # polaai.co.kr
│   │   ├── app\
│   │   ├── components\
│   │   └── package.json
│   │
│   ├── alumni\               # alumni.polaai.co.kr
│   │   ├── app\
│   │   ├── components\
│   │   └── package.json
│   │
│   └── admin\                # admin.polaai.co.kr
│       ├── app\
│       ├── components\
│       └── package.json
│
├── packages\
│   ├── ui\                   # 공용 UI 컴포넌트
│   │   ├── components\
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── lib\
│   │   │   └── utils.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── database\             # Prisma 클라이언트
│   │   ├── prisma\
│   │   │   └── schema.prisma
│   │   ├── index.ts
│   │   └── package.json
│   │
│   └── shared\               # 공용 유틸리티
│       ├── lib\
│       │   ├── validation.ts
│       │   └── format.ts
│       └── package.json
│
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### 전환 시기

다음 중 하나라도 해당되면 고려:

- [ ] 3개 이상 앱 운영 중
- [ ] 컴포넌트 중복이 심각함
- [ ] 팀이 2개 이상으로 나뉨
- [ ] 버전 관리가 복잡함
- [ ] 동시 배포가 필요함

---

## 영향도 분석

### 기존 서비스 (polaai.co.kr)

#### 변경 사항: 없음 ✅

```
[현재]
polaai.co.kr
  ├── 현재 수강생 로그인/대시보드
  ├── 관리자 로그인/대시보드
  └── API

[Phase 1 적용 후]
polaai.co.kr
  ├── 현재 수강생 로그인/대시보드 ← 그대로
  ├── 관리자 로그인/대시보드      ← 그대로
  └── API                        ← 그대로

※ 변경 없음, 계속 동일하게 운영
```

#### Vercel 배포: 유지

- 현재 Vercel 프로젝트 그대로 유지
- 배포 설정 변경 없음
- 도메인 연결 유지
- 환경변수 유지

---

### 데이터베이스

#### 변경 사항: 필드 추가만

```prisma
// 기존 User 모델
model User {
  id              String      @id @default(cuid())
  email           String      @unique
  name            String
  phone           String?
  password        String
  cohortId        String?
  cohort          Cohort?     @relation(fields: [cohortId], references: [id])
  // ... 기존 필드들
}

// 추가되는 필드 (기존 데이터에 영향 없음)
model User {
  // ... 기존 필드 모두 유지 ...

  // 새로 추가되는 필드
  status          UserStatus  @default(active)   ← 기존 사용자 모두 'active'
  graduatedAt     DateTime?                      ← NULL 허용

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum UserStatus {
  active      // 현재 수강생
  graduated   // 수료생
  inactive    // 비활성
}
```

#### 마이그레이션 안전성

```sql
-- 1. enum 생성 (기존 데이터 영향 없음)
CREATE TYPE "UserStatus" AS ENUM ('active', 'graduated', 'inactive');

-- 2. 필드 추가 (default 값으로 안전)
ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "graduatedAt" TIMESTAMP(3);

-- 결과: 기존 사용자 모두 status='active', graduatedAt=NULL
-- 기존 앱 동작에 영향 없음
```

---

### 새 서비스 (alumni.polaai.co.kr)

#### 변경 사항: 신규 추가 ✅

```
[Phase 1 적용 후]
alumni.polaai.co.kr
  ├── 수료생 로그인        ← 새로 추가
  ├── 수료생 대시보드      ← 새로 추가
  ├── 커뮤니케이션         ← 기존 컴포넌트 재활용
  └── 마케팅 소식          ← 기존 컴포넌트 재활용

※ 완전히 새로운 서비스, 기존에 영향 없음
```

#### Vercel 배포: 신규 프로젝트

- Vercel에서 새 프로젝트 생성
- 새 도메인 연결 (alumni.polaai.co.kr)
- 환경변수 복사 (같은 DB 사용)

---

## 마이그레이션 가이드

### Step 1: 새 프로젝트 생성 (로컬)

```bash
# F:\startpackage-alumni 폴더 생성
cd F:\
npx create-next-app@latest startpackage-alumni

# 옵션 선택
✔ Would you like to use TypeScript? Yes
✔ Would you like to use ESLint? Yes
✔ Would you like to use Tailwind CSS? Yes
✔ Would you like to use `src/` directory? No
✔ Would you like to use App Router? Yes
✔ Would you like to customize the default import alias? No
```

### Step 2: 기본 설정 복사

```bash
# 기존 프로젝트에서 설정 파일 복사
cd F:\startpackage-alumni

# Tailwind 설정
cp ../startpackage/tailwind.config.ts .
cp ../startpackage/app/globals.css ./app/

# Prisma 설정
cp -r ../startpackage/prisma .

# tsconfig
cp ../startpackage/tsconfig.json .

# 환경변수
cp ../startpackage/.env.example .env
# .env 수정: 같은 DATABASE_URL 사용
```

### Step 3: 필수 패키지 설치

```bash
cd F:\startpackage-alumni

# Prisma
npm install @prisma/client
npm install -D prisma

# NextAuth
npm install next-auth

# UI 컴포넌트
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge

# Prisma 생성
npx prisma generate
```

### Step 4: 기본 구조 생성

```bash
# 폴더 구조 생성
mkdir -p app/login
mkdir -p app/dashboard
mkdir -p app/communication
mkdir -p app/announcements
mkdir -p app/api/auth/[...nextauth]
mkdir -p components/ui
mkdir -p lib
```

### Step 5: 공용 컴포넌트 복사

```bash
# UI 컴포넌트 복사
cp ../startpackage/components/ui/button.tsx ./components/ui/
cp ../startpackage/components/ui/input.tsx ./components/ui/
cp ../startpackage/components/ui/card.tsx ./components/ui/

# 유틸리티 복사
cp ../startpackage/lib/utils.ts ./lib/
cp ../startpackage/lib/prisma.ts ./lib/
```

### Step 6: DB 마이그레이션

```bash
cd F:\startpackage

# Prisma 스키마에 필드 추가
# (prisma/schema.prisma 수정)

# 마이그레이션 생성
npx prisma migrate dev --name add_user_status

# 수료생 앱에도 적용
cd F:\startpackage-alumni
npx prisma generate
```

### Step 7: 수료생 앱 개발

```bash
cd F:\startpackage-alumni

# 로그인 페이지 작성
# app/login/page.tsx

# 대시보드 작성
# app/dashboard/page.tsx

# 인증 설정
# app/api/auth/[...nextauth]/route.ts
```

### Step 8: 로컬 테스트

```bash
# 기존 앱 테스트 (포트 3000)
cd F:\startpackage
npm run dev

# 수료생 앱 테스트 (포트 3001)
cd F:\startpackage-alumni
npm run dev -- -p 3001
```

### Step 9: Vercel 배포

```bash
cd F:\startpackage-alumni

# Vercel 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod

# 도메인 연결
vercel domains add alumni.polaai.co.kr
```

---

## 디렉토리 구조

### 기존 프로젝트 (startpackage)

```
F:\startpackage\
├── .claude\
│   ├── alumni-service-plan.md
│   ├── monorepo-architecture.md
│   └── CLAUDE.md
├── app\
│   ├── (admin)\
│   │   └── layout.tsx
│   ├── dashboard\
│   │   ├── page.tsx
│   │   ├── workflows\
│   │   ├── submission\
│   │   ├── communication\
│   │   └── announcements\
│   ├── login\
│   ├── signup\
│   ├── api\
│   │   ├── auth\
│   │   ├── workflows\
│   │   └── ...
│   ├── layout.tsx
│   └── globals.css
├── components\
│   └── ui\
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
├── lib\
│   ├── auth.ts
│   ├── prisma.ts
│   └── utils.ts
├── prisma\
│   ├── schema.prisma
│   └── migrations\
├── .env
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

**변경 사항: 없음 (그대로 유지)**

---

### 새 프로젝트 (startpackage-alumni)

```
F:\startpackage-alumni\
├── app\
│   ├── login\
│   │   └── page.tsx              # 수료생 로그인
│   ├── dashboard\
│   │   └── page.tsx              # 수료생 대시보드
│   ├── communication\
│   │   └── page.tsx              # 커뮤니케이션
│   ├── announcements\
│   │   └── page.tsx              # 마케팅 소식
│   ├── api\
│   │   ├── auth\
│   │   │   └── [...nextauth]\
│   │   │       └── route.ts      # 수료생 인증
│   │   ├── communication\
│   │   │   └── route.ts          # API (기존 재활용)
│   │   └── announcements\
│   │       └── route.ts          # API (기존 재활용)
│   ├── layout.tsx
│   └── globals.css               # 기존 것 복사
├── components\
│   ├── AlumniHeader.tsx          # 수료생 헤더
│   ├── ServiceCard.tsx           # 서비스 카드
│   └── ui\                       # 기존 컴포넌트 복사
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
├── lib\
│   ├── auth.ts                   # 수료생 인증 설정
│   ├── prisma.ts                 # DB 연결 (같은 DB)
│   └── utils.ts                  # 유틸리티 (복사)
├── prisma\
│   └── schema.prisma             # 기존 스키마 복사
├── .env                          # 같은 DATABASE_URL
├── .env.example
├── package.json
├── tailwind.config.ts            # 기존 것 복사
├── tsconfig.json
├── next.config.mjs
└── vercel.json
```

---

## 체크리스트

### 프로젝트 설정

#### 기존 서비스 보호
- [ ] 기존 프로젝트 백업 (git commit)
- [ ] 기존 DB 백업 (pg_dump 또는 Neon 스냅샷)
- [ ] 기존 Vercel 배포 설정 확인
- [ ] .env 파일 백업

#### 새 프로젝트 생성
- [ ] F:\startpackage-alumni 폴더 생성
- [ ] Next.js 15 프로젝트 초기화
- [ ] TypeScript, Tailwind 설정
- [ ] Git 초기화 (별도 레포지토리)

### 설정 파일 복사

- [ ] tailwind.config.ts 복사
- [ ] app/globals.css 복사
- [ ] tsconfig.json 복사
- [ ] .env.example 복사 및 수정
- [ ] prisma/schema.prisma 복사

### 패키지 설치

- [ ] @prisma/client 설치
- [ ] next-auth 설치
- [ ] lucide-react 설치
- [ ] class-variance-authority 설치
- [ ] npx prisma generate 실행

### 컴포넌트 복사

- [ ] components/ui/button.tsx
- [ ] components/ui/input.tsx
- [ ] components/ui/card.tsx
- [ ] lib/utils.ts
- [ ] lib/prisma.ts

### DB 마이그레이션

- [ ] Prisma 스키마에 UserStatus enum 추가
- [ ] User 모델에 status, graduatedAt 필드 추가
- [ ] npx prisma migrate dev 실행
- [ ] 기존 사용자 데이터 확인 (모두 active여야 함)
- [ ] 테스트 수료생 생성 (status='graduated')

### 수료생 앱 개발

- [ ] app/login/page.tsx 작성
- [ ] app/dashboard/page.tsx 작성
- [ ] components/AlumniHeader.tsx 작성
- [ ] components/ServiceCard.tsx 작성
- [ ] lib/auth.ts 작성 (수료생 인증)
- [ ] app/api/auth/[...nextauth]/route.ts 작성

### 기능 연동

- [ ] app/communication/page.tsx 작성 (재활용)
- [ ] app/announcements/page.tsx 작성 (재활용)
- [ ] API 엔드포인트 확인
- [ ] DB 쿼리 테스트

### 로컬 테스트

- [ ] 기존 앱 동작 확인 (npm run dev)
- [ ] 수료생 앱 동작 확인 (npm run dev -p 3001)
- [ ] 수료생 로그인 테스트
- [ ] 현재 수강생 로그인 차단 테스트
- [ ] 커뮤니케이션 기능 테스트
- [ ] 마케팅 소식 기능 테스트

### Vercel 배포

- [ ] Vercel 프로젝트 생성 (alumni-app)
- [ ] Git 레포지토리 연결
- [ ] 환경변수 설정 (DATABASE_URL, NEXTAUTH_SECRET 등)
- [ ] 빌드 테스트
- [ ] 프로덕션 배포
- [ ] alumni.polaai.co.kr 도메인 연결
- [ ] SSL 인증서 확인

### 최종 검증

- [ ] 기존 서비스 정상 동작 확인
- [ ] 수료생 앱 정상 동작 확인
- [ ] DB 데이터 무결성 확인
- [ ] 성능 테스트
- [ ] 보안 점검

---

## 롤백 계획

### 문제 발생 시

#### 수료생 앱 문제
```bash
# Vercel에서 수료생 앱만 중단
vercel --cwd F:\startpackage-alumni --prod --pause

# 도메인 연결 해제
vercel domains rm alumni.polaai.co.kr
```

**영향:** 기존 서비스는 전혀 영향 없음

#### DB 마이그레이션 문제
```sql
-- 필드 제거 (필요시)
ALTER TABLE "User"
  DROP COLUMN "status",
  DROP COLUMN "graduatedAt";

DROP TYPE "UserStatus";
```

**영향:** 기존 서비스는 이 필드를 사용하지 않으므로 영향 없음

---

## 모니터링

### 배포 후 확인 사항

#### 기존 서비스 (polaai.co.kr)
- [ ] 로그인 정상 작동
- [ ] 대시보드 정상 작동
- [ ] 워크플로우 정상 작동
- [ ] API 응답 시간 정상
- [ ] 에러 로그 없음

#### 수료생 앱 (alumni.polaai.co.kr)
- [ ] 로그인 정상 작동
- [ ] 대시보드 정상 작동
- [ ] 커뮤니케이션 정상 작동
- [ ] 마케팅 소식 정상 작동
- [ ] API 응답 시간 정상

#### 데이터베이스
- [ ] 연결 풀 정상
- [ ] 쿼리 성능 정상
- [ ] 데이터 무결성 확인

---

## FAQ

### Q1: 기존 서비스에 영향이 있나요?
**A:** 전혀 없습니다. 기존 코드는 변경하지 않고, DB에는 필드만 추가합니다.

### Q2: DB 마이그레이션이 안전한가요?
**A:** 네, default 값을 사용하므로 기존 데이터에 영향 없습니다.

### Q3: 롤백이 가능한가요?
**A:** 네, 수료생 앱만 중단하면 됩니다. 기존 서비스는 영향 없습니다.

### Q4: 나중에 Monorepo로 전환 가능한가요?
**A:** 네, Phase 2로 전환할 수 있습니다.

### Q5: 비용이 추가되나요?
**A:** Vercel 프로젝트 1개 추가되지만, Free Tier 범위 내입니다. 서브도메인은 무료입니다.

---

**문서 버전:** 1.0.0
**최종 수정일:** 2025-10-28
**작성자:** Claude Code
