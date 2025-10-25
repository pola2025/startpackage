# 스타트패키지 시스템 - 기술 스택 및 아키텍처

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [아키텍처 설계](#아키텍처-설계)
4. [데이터베이스 설계](#데이터베이스-설계)
5. [파일 업로드/다운로드 전략](#파일-업로드다운로드-전략)
6. [배포 및 인프라](#배포-및-인프라)

---

## 시스템 개요

### 핵심 요구사항
- 사용자 자료 제출 시스템
- 관리자 대시보드 (기수/사용자 관리, 워크플로우 제어)
- 자동 알림 시스템 (SMS/이메일)
- 파일 업로드/다운로드 (이미지, PDF, 문서)
- 마감일 관리 및 자동화
- 디자인 시안 업로드 및 발주 시스템

---

## 기술 스택

### 🎨 Frontend

#### 사용자 포털
```
Framework: Next.js 14 (App Router)
Language: TypeScript
UI Library: shadcn/ui + Tailwind CSS
State: React Query + Zustand
Form: React Hook Form + Zod
File Upload: react-dropzone + @uploadthing/react
```

**선택 이유:**
- Next.js 14: SSR/ISR로 SEO 최적화, 빠른 초기 로딩
- shadcn/ui: 커스터마이징 가능한 컴포넌트, 한국어 폰트 최적화 용이
- React Query: 서버 상태 관리 및 캐싱 최적화
- Zustand: 가볍고 직관적인 클라이언트 상태 관리

#### 관리자 대시보드
```
Framework: Next.js 14 (App Router)
Language: TypeScript
UI Library: shadcn/ui + Tailwind CSS
Dashboard: Recharts (차트/통계)
Table: @tanstack/react-table
Calendar: react-big-calendar (기수 스케줄)
```

**주요 기능:**
- 기수별 사용자 현황 대시보드
- 제출 현황 추적 (진행률, 미제출 항목)
- 워크플로우 제어 (시안 업로드, 발주 승인)
- 알림 발송 이력 조회
- 사용자 일괄 등록 (CSV 업로드)

---

### 🔧 Backend

#### API Server
```
Framework: Next.js 14 API Routes (App Router)
Language: TypeScript
API Style: RESTful API
Validation: Zod
Authentication: NextAuth.js v5 (Auth.js)
Session: JWT + Database Session
```

**선택 이유:**
- Next.js API Routes: Frontend와 통합, 배포 간편
- NextAuth.js: 소셜 로그인 확장 가능, 세션 관리 내장
- Zod: TypeScript와 완벽 통합, 런타임 검증

#### Alternative: Standalone API Server (확장성 고려 시)
```
Framework: Fastify or Hono
Language: TypeScript
API Docs: OpenAPI (Swagger)
```

---

### 💾 Database

#### Primary Database
```
Database: PostgreSQL 15+
ORM: Prisma
Hosting: Neon (무료/서버리스) or AWS RDS
Migration: Prisma Migrate
```

**선택 이유:**
- PostgreSQL: 관계형 데이터 최적화, JSON 지원
- Prisma: TypeScript 타입 안전성, 직관적 쿼리
- Neon: 서버리스로 비용 절감, 자동 스케일링

#### Database Schema (핵심)
```prisma
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  phone             String
  cohortId          String
  cohort            Cohort   @relation(fields: [cohortId], references: [id])

  // 수신 동의
  smsConsent        Boolean  @default(false)
  emailConsent      Boolean  @default(false)

  // 제출 자료
  submissions       Submission[]

  // 워크플로우
  workflows         Workflow[]

  // 알림 이력
  notifications     Notification[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Cohort {
  id                String   @id @default(cuid())
  name              String   // "1기", "2기"
  교육시작일        DateTime
  교육요일          String   // "화요일"
  자료제출마감일    DateTime

  users             User[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Submission {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  // 필수 제출 항목
  사업자등록증URL   String?
  프로필사진URL     String?
  메타광고관리자값  String?
  네이버검색광고ID  String?
  홈페이지컬러컨셉  String?

  // 기타 정보
  브랜드명          String?
  업종              String?
  주소              String?

  isComplete        Boolean  @default(false)
  completedAt       DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Workflow {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              String   // "명함", "전단지", "홈페이지"
  status            String   // "대기", "시안중", "발주대기", "발주완료", "제작완료", "발송완료"

  // 디자이너 업로드 시안
  시안URL           String?
  시안업로드일      DateTime?

  // 사용자 발주
  발주일            DateTime?
  발주승인일        DateTime?

  // 제작 및 발송
  제작완료일        DateTime?
  발송일            DateTime?
  운송장번호        String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Notification {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              String   // "회원가입완료", "마감7일전", etc.
  channel           String   // "SMS", "EMAIL"
  title             String
  message           String
  status            String   // "전송중", "성공", "실패"

  sentAt            DateTime @default(now())

  // 발송 결과
  errorMessage      String?

  createdAt         DateTime @default(now())
}

model Admin {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  role              String   // "super", "designer", "operator"

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

### 📁 File Upload/Download Strategy

#### File Storage
```
Service: AWS S3 or Cloudflare R2
CDN: CloudFront or Cloudflare CDN
Upload Library: UploadThing (Next.js 최적화)
```

**선택 이유:**
- S3/R2: 안정성, 확장성, 저렴한 비용
- UploadThing: Next.js 전용, 서버리스 최적화, 무료 플랜 제공
- CDN: 이미지 로딩 속도 최적화

#### Upload Flow
```typescript
// 사용자 포털
1. 사용자가 파일 선택 (react-dropzone)
2. 클라이언트에서 이미지 압축 (browser-image-compression)
3. UploadThing으로 S3 업로드
4. 업로드 완료 시 URL을 DB에 저장
5. 썸네일 자동 생성 (Sharp)

// 관리자 대시보드
1. 디자이너가 시안 업로드
2. PDF/이미지 변환 (pdf-lib)
3. S3 저장 후 사용자에게 알림 발송
```

#### File Types & Limits
```
사업자등록증: PDF/이미지, 최대 10MB
프로필사진: 이미지, 최대 5MB, 자동 리사이징 (800x800)
디자인 시안: PDF, 최대 20MB
CSV 업로드: 최대 2MB (사용자 일괄 등록)
```

#### Security
```typescript
// 파일 검증 (서버)
- MIME type 체크
- 파일 확장자 검증
- 바이러스 스캔 (ClamAV or AWS S3 Malware Protection)
- Signed URL로 다운로드 제한 (1시간 유효)
```

---

### 🔔 Notification System

#### SMS
```
Service: NCP SENS (네이버 클라우드)
Library: Custom ncpSensClient
Rate Limit: 초당 10건
```

#### Email
```
Service: SendGrid or AWS SES
Library: @sendgrid/mail or nodemailer
Template: React Email (코드 기반 템플릿)
```

#### Scheduling
```
Cron Job: Vercel Cron (무료) or node-cron
Trigger:
  - 매일 오전 9시: 마감일 알림 체크
  - 매주 교육 요일 오전 9시: 2주차 미제출 알림
```

---

### 🔐 Authentication & Authorization

#### User Authentication
```
Provider: NextAuth.js v5
Strategy:
  - Credentials (이메일/비밀번호)
  - OAuth (Google, Kakao - 선택)
Session: JWT + Database Session (보안 강화)
Password: bcrypt (해싱)
```

#### Admin Authentication
```
Role-Based Access Control (RBAC)
Roles:
  - super: 모든 권한
  - designer: 시안 업로드, 워크플로우 조회
  - operator: 사용자 관리, 알림 발송
```

#### Middleware Protection
```typescript
// middleware.ts
export default async function middleware(req: NextRequest) {
  const token = await getToken({ req });

  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  if (req.nextUrl.pathname.startsWith('/user')) {
    if (!token || token.role !== 'user') {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }
}
```

---

## 아키텍처 설계

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare / CDN                          │
│  - DDoS Protection                                           │
│  - SSL/TLS                                                   │
│  - Static Asset Caching                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js 14 (Vercel Deployment)                  │
│                                                               │
│  ┌─────────────────┐          ┌─────────────────┐            │
│  │  User Portal    │          │ Admin Dashboard │            │
│  │  (App Router)   │          │  (App Router)   │            │
│  └────────┬────────┘          └────────┬────────┘            │
│           │                            │                     │
│           └──────────┬─────────────────┘                     │
│                      │                                       │
│           ┌──────────▼──────────┐                            │
│           │   API Routes        │                            │
│           │   /api/user/*       │                            │
│           │   /api/admin/*      │                            │
│           │   /api/workflow/*   │                            │
│           │   /api/cron/*       │                            │
│           └──────────┬──────────┘                            │
└──────────────────────┼─────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │   AWS S3    │ │ NCP SENS    │
│  (Neon)     │ │ (UploadThing│ │  (SMS)      │
│             │ │  + R2)      │ │             │
│ - Users     │ │             │ │ SendGrid    │
│ - Cohorts   │ │ - Images    │ │  (Email)    │
│ - Workflows │ │ - PDFs      │ │             │
│ - Logs      │ │ - Docs      │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Folder Structure
```
startpackage/
├── app/
│   ├── (user)/                 # 사용자 포털
│   │   ├── dashboard/
│   │   ├── submission/
│   │   ├── workflow/
│   │   └── layout.tsx
│   │
│   ├── (admin)/                # 관리자 대시보드
│   │   ├── cohorts/
│   │   ├── users/
│   │   ├── workflows/
│   │   ├── notifications/
│   │   └── layout.tsx
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── user/
│   │   ├── admin/
│   │   ├── workflow/
│   │   ├── upload/
│   │   └── cron/
│   │
│   └── layout.tsx
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── user/                   # 사용자 포털 컴포넌트
│   └── admin/                  # 관리자 컴포넌트
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── notification/
│   │   └── autoNotificationSystem.ts
│   ├── sms/
│   │   └── ncpSensClient.ts
│   ├── email/
│   │   └── sendgridClient.ts
│   ├── workflow/
│   │   └── deadlineManager.ts
│   └── upload/
│       └── uploadthingConfig.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── TECH_STACK.md
│   ├── API_SPEC.md
│   └── WORKFLOW.md
│
└── package.json
```

---

## 배포 및 인프라

### Hosting
```
Frontend + Backend: Vercel (무료 Hobby 플랜)
  - Next.js 최적화
  - 자동 CI/CD
  - Edge Functions
  - Cron Jobs 지원

Database: Neon PostgreSQL (무료 플랜)
  - 512MB RAM
  - 10GB Storage
  - Serverless

File Storage: UploadThing (무료 플랜) + Cloudflare R2
  - 2GB Storage (UploadThing)
  - 무제한 (R2 - $0.015/GB)
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run Prisma migrations
        run: npx prisma migrate deploy

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Monitoring
```
Error Tracking: Sentry
Analytics: Vercel Analytics (무료)
Logs: Vercel Logs
Uptime: UptimeRobot (무료)
```

---

## 비용 예측 (월간)

### 무료/저비용 구성
```
Vercel: $0 (Hobby 플랜)
Neon DB: $0 (무료 플랜)
UploadThing: $0 (2GB)
Cloudflare R2: ~$1 (10GB 기준)
NCP SENS: ~₩10,000 (SMS 100건)
SendGrid: $0 (100 emails/day)

총 월간 비용: ~₩15,000
```

### 프로덕션 구성 (사용자 100명 기준)
```
Vercel Pro: $20/month
Neon Production: $19/month
Cloudflare R2: ~$5/month (100GB)
NCP SENS: ~₩50,000 (SMS 500건)
SendGrid: $0 (무료 플랜으로 충분)

총 월간 비용: ~₩130,000
```

---

## 개발 로드맵

### Phase 1: MVP (4주)
- [ ] 데이터베이스 설계 및 Prisma 셋업
- [ ] NextAuth.js 인증 시스템
- [ ] 사용자 자료 제출 페이지
- [ ] 파일 업로드 (UploadThing)
- [ ] 자동 알림 시스템 (SMS)

### Phase 2: 관리자 기능 (3주)
- [ ] 관리자 대시보드 UI
- [ ] 기수 관리
- [ ] 사용자 관리
- [ ] 워크플로우 제어
- [ ] 시안 업로드

### Phase 3: 최적화 (2주)
- [ ] 이메일 발송 시스템
- [ ] 통계 및 리포트
- [ ] CSV 일괄 업로드
- [ ] 성능 최적화
- [ ] 보안 강화

---

## 결론

이 기술 스택은:
✅ **비용 효율적** (초기 월 1만원대)
✅ **확장 가능** (사용자 증가 시 쉽게 스케일업)
✅ **개발 속도** (Next.js + Prisma로 빠른 개발)
✅ **유지보수 용이** (TypeScript + 타입 안전성)
✅ **한국 시장 최적화** (NCP SENS, 한글 지원)

필요시 단계별로 AWS/Azure로 마이그레이션 가능합니다.
