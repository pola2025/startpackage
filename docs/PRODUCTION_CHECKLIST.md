# 스타트패키지 프로덕션 배포 체크리스트

> 프로덕션 환경 배포 전 필수 확인 사항

**작성일**: 2025-10-25
**버전**: 1.0

---

## 목차

1. [환경 변수 설정](#1-환경-변수-설정)
2. [데이터베이스 준비](#2-데이터베이스-준비)
3. [보안 설정](#3-보안-설정)
4. [파일 업로드 설정](#4-파일-업로드-설정)
5. [알림 시스템 설정](#5-알림-시스템-설정)
6. [배포 설정](#6-배포-설정)
7. [성능 최적화](#7-성능-최적화)
8. [모니터링 및 로깅](#8-모니터링-및-로깅)
9. [백업 전략](#9-백업-전략)
10. [배포 전 최종 테스트](#10-배포-전-최종-테스트)

---

## 1. 환경 변수 설정

### 필수 환경 변수

```bash
# .env.production

# ============================================
# 데이터베이스 (Neon PostgreSQL)
# ============================================
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/startpackage?sslmode=require"

# ============================================
# NextAuth
# ============================================
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # 강력한 랜덤 시크릿

# ============================================
# NCP SENS SMS
# ============================================
NCP_SERVICE_ID="ncp:sms:kr:xxxxx:xxxxx"
NCP_ACCESS_KEY="ncp_iam_XXXXX"
NCP_SECRET_KEY="ncp_iam_XXXXX"
NCP_SENDER_PHONE="01012345678"  # 실제 등록된 발신 번호

# ============================================
# Resend 이메일 발송
# ============================================
RESEND_API_KEY="re_xxxxx"
EMAIL_FROM="noreply@yourdomain.com"

# ============================================
# 슬랙 알림 (관리자)
# ============================================
SLACK_BOT_TOKEN="xoxb-xxxxx"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"

# ============================================
# 텔레그램 봇 (관리자 알림)
# ============================================
TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_ADMIN_CHAT_ID="123456789"

# ============================================
# 애플리케이션
# ============================================
NODE_ENV="production"
APP_URL="https://your-domain.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# ============================================
# Sentry (옵션)
# ============================================
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

### ✅ 체크리스트

- [ ] DATABASE_URL 프로덕션 DB로 변경
- [ ] NEXTAUTH_SECRET 강력한 랜덤 값으로 생성
- [ ] NCP SENS 실제 API 키로 교체
- [ ] Resend API 키 발급 및 설정
- [ ] 슬랙/텔레그램 봇 설정 (관리자 알림용)
- [ ] 모든 URL을 프로덕션 도메인으로 변경
- [ ] Vercel에 환경 변수 등록 완료

---

## 2. 데이터베이스 준비

### Neon PostgreSQL 설정

#### 1) Neon 프로젝트 생성
```bash
# https://neon.tech 에서 프로젝트 생성
# Production 브랜치 생성
```

#### 2) Prisma 마이그레이션 적용
```bash
# 로컬에서 프로덕션 DB로 마이그레이션
DATABASE_URL="프로덕션 URL" npx prisma migrate deploy

# 또는 Prisma Client 재생성
npx prisma generate
```

#### 3) 초기 데이터 생성 (Seed)

**기수 데이터 생성**
```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 기수 생성
  await prisma.cohort.createMany({
    data: [
      {
        name: '19기',
        englishName: '19th',
        교육시작일: new Date('2025-11-01'),
        교육요일: '목',
        자료제출마감일: new Date('2025-11-20'),
        isActive: true,
      },
    ],
  });

  // 초기 관리자 계정 생성
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('Admin1234!', 10);

  await prisma.admin.create({
    data: {
      email: 'admin@polarad.co.kr',
      password: hashedPassword,
      name: '시스템 관리자',
      role: 'super',
    },
  });

  console.log('Seed 완료!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

```bash
npx tsx prisma/seed.ts
```

### ✅ 체크리스트

- [ ] Neon 프로덕션 데이터베이스 생성
- [ ] Prisma 마이그레이션 적용 완료
- [ ] 초기 기수 데이터 생성
- [ ] 초기 관리자 계정 생성
- [ ] 데이터베이스 백업 자동화 설정

---

## 3. 보안 설정

### HTTPS 강제

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // HTTPS 강제 (프로덕션만)
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }

  return NextResponse.next();
}
```

### CORS 설정

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

### 비밀번호 정책

```typescript
// lib/auth/passwordPolicy.ts
export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '대문자가 최소 1개 포함되어야 합니다' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '소문자가 최소 1개 포함되어야 합니다' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '숫자가 최소 1개 포함되어야 합니다' };
  }

  return { valid: true };
}
```

### ✅ 체크리스트

- [ ] HTTPS 강제 설정
- [ ] CORS 정책 설정
- [ ] 비밀번호 정책 강화 (8자 이상, 대소문자+숫자)
- [ ] API Rate Limiting 설정
- [ ] SQL Injection 방지 (Prisma 사용으로 자동 방어)
- [ ] XSS 방지 (React 자동 이스케이프)
- [ ] CSRF 토큰 설정 (NextAuth 내장)

---

## 4. 파일 업로드 설정

### Cloudflare R2 설정

```typescript
// lib/upload/r2Client.ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

### 파일 크기 제한

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 최대 10MB
    },
  },
};
```

### 파일 타입 검증

```typescript
// lib/upload/fileValidation.ts
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

export function validateFileType(file: File, type: 'image' | 'document'): boolean {
  if (type === 'image') {
    return ALLOWED_IMAGE_TYPES.includes(file.type);
  }
  return ALLOWED_DOCUMENT_TYPES.includes(file.type);
}

export function validateFileSize(file: File, maxSizeMB: number): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}
```

### ✅ 체크리스트

- [ ] Cloudflare R2 버킷 생성
- [ ] R2 액세스 키 발급 및 환경 변수 설정
- [ ] 파일 업로드 크기 제한 설정
- [ ] 파일 타입 화이트리스트 설정
- [ ] 이미지 최적화 설정 (Sharp)
- [ ] 업로드 폴더 구조 정리

---

## 5. 알림 시스템 설정

### NCP SENS SMS 테스트

```bash
# SMS 발송 테스트
curl -X POST https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages \
  -H "Content-Type: application/json" \
  -H "x-ncp-apigw-timestamp: {timestamp}" \
  -H "x-ncp-iam-access-key: {accessKey}" \
  -H "x-ncp-apigw-signature-v2: {signature}" \
  -d '{
    "type": "SMS",
    "from": "01012345678",
    "content": "테스트 메시지",
    "messages": [{"to": "01012345678"}]
  }'
```

### Resend 이메일 테스트

```typescript
// lib/email/test.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const data = await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: 'test@example.com',
      subject: '스타트패키지 테스트 이메일',
      html: '<p>이메일 발송 테스트입니다.</p>',
    });
    console.log('Email sent:', data);
  } catch (error) {
    console.error('Email error:', error);
  }
}

testEmail();
```

### ✅ 체크리스트

- [ ] NCP SENS 발신 번호 등록 완료
- [ ] NCP SENS 테스트 메시지 발송 성공
- [ ] Resend 도메인 인증 완료
- [ ] Resend 테스트 이메일 발송 성공
- [ ] 슬랙 웹훅 테스트 성공
- [ ] 텔레그램 봇 알림 테스트 성공

---

## 6. 배포 설정

### Vercel 설정

#### 1) Vercel CLI 설치
```bash
npm i -g vercel
```

#### 2) Vercel 프로젝트 연결
```bash
vercel link
```

#### 3) 환경 변수 설정
```bash
# Vercel 대시보드에서 환경 변수 등록
# Settings > Environment Variables

# 또는 CLI로 등록
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ...
```

#### 4) 배포
```bash
# 프로덕션 배포
vercel --prod

# 또는 Git push로 자동 배포
git push origin main
```

### vercel.json 설정 확인

```json
{
  "crons": [
    {
      "path": "/api/cron/deadline-reminder",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/2week-reminder-mon",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/2week-reminder-tue",
      "schedule": "0 9 * * 2"
    },
    {
      "path": "/api/cron/2week-reminder-wed",
      "schedule": "0 9 * * 3"
    },
    {
      "path": "/api/cron/2week-reminder-thu",
      "schedule": "0 9 * * 4"
    },
    {
      "path": "/api/cron/2week-reminder-fri",
      "schedule": "0 9 * * 5"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### ✅ 체크리스트

- [ ] Vercel 프로젝트 생성 및 연결
- [ ] 프로덕션 도메인 설정
- [ ] SSL 인증서 자동 적용 확인
- [ ] Vercel 환경 변수 등록 완료
- [ ] Cron Job 설정 확인
- [ ] 보안 헤더 설정 확인

---

## 7. 성능 최적화

### Next.js 최적화

```typescript
// next.config.ts
const nextConfig = {
  // 이미지 최적화
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
    ],
  },

  // 번들 크기 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 정적 리소스 캐싱
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### Prisma 최적화

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### ✅ 체크리스트

- [ ] 이미지 최적화 (AVIF, WebP)
- [ ] console.log 제거 (프로덕션)
- [ ] 정적 리소스 캐싱 설정
- [ ] Prisma Connection Pool 설정
- [ ] API Route 캐싱 전략 수립
- [ ] React Query 캐싱 설정

---

## 8. 모니터링 및 로깅

### Sentry 설정

#### 1) Sentry 프로젝트 생성
```bash
# https://sentry.io 에서 Next.js 프로젝트 생성
```

#### 2) Sentry SDK 설치
```bash
npm install --save @sentry/nextjs
npx @sentry/wizard -i nextjs
```

#### 3) sentry.config.js 설정
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 로깅 전략

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.info(`[INFO] ${message}`, meta);
  },
  error: (message: string, error?: Error, meta?: any) => {
    console.error(`[ERROR] ${message}`, error, meta);
    // Sentry로 에러 전송
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, { extra: meta });
    }
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta);
  },
};
```

### ✅ 체크리스트

- [ ] Sentry 프로젝트 생성 및 SDK 설치
- [ ] 에러 트래킹 테스트
- [ ] Vercel Analytics 활성화
- [ ] 로깅 시스템 구축
- [ ] 성능 모니터링 (Core Web Vitals)

---

## 9. 백업 전략

### 데이터베이스 백업

**Neon 자동 백업 설정**
```
Neon은 기본적으로 자동 백업 제공:
- Point-in-Time Recovery (PITR)
- 7일 보관 (무료 플랜)
- 30일 보관 (Pro 플랜)
```

**수동 백업 스크립트**
```bash
# scripts/backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > ./backups/${BACKUP_FILE}
echo "Backup created: ${BACKUP_FILE}"
```

### 파일 백업

```bash
# Cloudflare R2 버킷 복제
aws s3 sync s3://your-bucket s3://your-backup-bucket --source-region auto
```

### ✅ 체크리스트

- [ ] Neon 자동 백업 활성화 확인
- [ ] 수동 백업 스크립트 작성
- [ ] 백업 복구 테스트 완료
- [ ] R2 파일 백업 자동화

---

## 10. 배포 전 최종 테스트

### 기능 테스트

#### 사용자 플로우
- [ ] 회원가입 (기수 선택, 정보 입력)
- [ ] 로그인/로그아웃
- [ ] 자료 제출 (모든 필드)
- [ ] 파일 업로드 (사업자등록증, 프로필사진)
- [ ] 워크플로우 상태 확인
- [ ] 시안 확인 및 피드백 작성
- [ ] 커뮤니케이션 (문의 작성, 답변)

#### 관리자 플로우
- [ ] 관리자 로그인
- [ ] 기수 관리 (생성, 수정)
- [ ] 사용자 관리 (조회, 필터)
- [ ] 시안 업로드
- [ ] 워크플로우 상태 변경
- [ ] 택배 정보 입력
- [ ] 알림 발송 (SMS, 이메일)
- [ ] 커뮤니케이션 (답변 작성)

#### 알림 테스트
- [ ] 회원가입 완료 알림
- [ ] 2주차 미제출 알림
- [ ] 마감일 알림 (D-7, D-3, D-1)
- [ ] 시안 완료 알림
- [ ] 발주 완료 알림
- [ ] 발송 완료 알림

#### Cron Job 테스트
- [ ] 마감일 리마인더 (매일 09:00)
- [ ] 2주차 알림 (요일별 09:00)

### 성능 테스트

```bash
# Lighthouse 테스트
npm install -g lighthouse
lighthouse https://your-domain.com --view

# 목표:
# - Performance: > 90
# - Accessibility: > 95
# - Best Practices: > 90
# - SEO: > 90
```

### 보안 테스트

```bash
# OWASP ZAP 스캔
# SQL Injection, XSS, CSRF 테스트
```

### ✅ 최종 체크리스트

- [ ] 모든 기능 테스트 통과
- [ ] 모든 알림 테스트 통과
- [ ] Cron Job 정상 작동 확인
- [ ] 성능 테스트 목표 달성
- [ ] 보안 취약점 스캔 완료
- [ ] 모바일 반응형 테스트 완료
- [ ] 크로스 브라우저 테스트 (Chrome, Safari, Firefox)

---

## 배포 후 모니터링

### 배포 직후 (첫 24시간)

- [ ] 에러 로그 실시간 모니터링 (Sentry)
- [ ] API 응답 시간 확인 (Vercel Analytics)
- [ ] 데이터베이스 연결 상태 확인
- [ ] Cron Job 실행 로그 확인
- [ ] 첫 사용자 가입 및 제출 테스트

### 정기 모니터링 (주간)

- [ ] 에러 발생 현황 리뷰
- [ ] 성능 메트릭 분석
- [ ] 데이터베이스 용량 확인
- [ ] R2 스토리지 사용량 확인
- [ ] 알림 발송 실패율 확인

---

## 롤백 계획

### 즉시 롤백이 필요한 경우

1. **Vercel 이전 배포로 롤백**
   ```bash
   vercel rollback [deployment-url]
   ```

2. **데이터베이스 롤백**
   ```bash
   # Neon PITR 복구
   # Neon 대시보드에서 특정 시점으로 복구
   ```

3. **긴급 공지**
   - 슬랙/텔레그램으로 관리자 알림
   - 사용자에게 긴급 공지사항 게시

---

## 연락처

**긴급 상황 연락처**
- 개발자: [연락처]
- 시스템 관리자: [연락처]
- Vercel Support: https://vercel.com/support
- Neon Support: https://neon.tech/support

---

**프로덕션 배포 완료 후 이 문서 아카이브 및 배포 리포트 작성!**
