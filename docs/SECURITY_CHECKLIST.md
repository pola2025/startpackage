# 보안 체크리스트

> 스타트패키지 시스템 보안 점검 항목

**작성일**: 2025-10-25
**버전**: 1.0

---

## 목차

1. [인증 및 인가](#1-인증-및-인가)
2. [데이터 보호](#2-데이터-보호)
3. [네트워크 보안](#3-네트워크-보안)
4. [파일 업로드 보안](#4-파일-업로드-보안)
5. [API 보안](#5-api-보안)
6. [SEO 차단](#6-seo-차단)
7. [환경 변수 관리](#7-환경-변수-관리)
8. [로깅 및 모니터링](#8-로깅-및-모니터링)
9. [정기 보안 점검](#9-정기-보안-점검)

---

## 1. 인증 및 인가

### 비밀번호 보안

#### ✅ 적용 완료
- [x] bcrypt 해싱 사용 (라운드 10)
- [x] 비밀번호 최소 8자 이상 요구
- [x] 대문자, 소문자, 숫자 조합 요구

#### 📝 권장사항
```typescript
// lib/auth/passwordPolicy.ts
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // 선택사항
};

export function validatePassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, message: `비밀번호는 최소 ${PASSWORD_POLICY.minLength}자 이상이어야 합니다` };
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: '대문자가 최소 1개 포함되어야 합니다' };
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: '소문자가 최소 1개 포함되어야 합니다' };
  }

  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    return { valid: false, message: '숫자가 최소 1개 포함되어야 합니다' };
  }

  return { valid: true };
}
```

### 세션 관리

#### ✅ 적용 완료
- [x] NextAuth.js JWT 세션
- [x] 세션 만료 시간 설정 (7일)
- [x] 자동 로그아웃 (세션 만료 시)

#### 📋 체크리스트
- [ ] 비밀번호 변경 시 모든 세션 무효화
- [ ] 의심스러운 로그인 시도 감지
- [ ] 로그인 실패 횟수 제한 (5회)
- [ ] IP 기반 로그인 제한 (선택사항)

### 권한 관리

#### ✅ RBAC (Role-Based Access Control)
```typescript
// lib/auth/roles.ts
export const PERMISSIONS = {
  super: ['*'], // 모든 권한
  designer: [
    'workflow:read',
    'workflow:upload_design',
    'user:read',
  ],
  operator: [
    'user:read',
    'user:write',
    'cohort:manage',
    'notification:send',
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const rolePermissions = PERMISSIONS[role as keyof typeof PERMISSIONS];
  if (!rolePermissions) return false;

  if (rolePermissions.includes('*')) return true;
  return rolePermissions.includes(permission);
}
```

#### 📋 체크리스트
- [x] 역할별 권한 분리 (super, designer, operator)
- [x] Middleware를 통한 라우트 보호
- [ ] API 엔드포인트별 권한 검증
- [ ] 관리자 활동 로그 기록

---

## 2. 데이터 보호

### 개인정보 보호

#### ✅ 적용 완료
- [x] 비밀번호 bcrypt 해싱
- [x] HTTPS 강제 (프로덕션)
- [x] 데이터베이스 암호화 연결 (SSL)

#### 📋 체크리스트
- [ ] 개인정보 처리방침 페이지 작성
- [ ] 이용약관 작성 및 동의 절차
- [ ] 개인정보 수집 최소화
- [ ] 회원 탈퇴 시 데이터 삭제 정책

### 데이터베이스 보안

#### ✅ SQL Injection 방지
- [x] Prisma ORM 사용 (자동 방어)
- [x] Prepared Statements 사용

#### 📋 체크리스트
- [ ] 데이터베이스 백업 자동화 (일 1회)
- [ ] 백업 데이터 암호화
- [ ] 접근 권한 최소화 (Least Privilege)
- [ ] 정기적인 보안 패치 적용

---

## 3. 네트워크 보안

### HTTPS 설정

#### ✅ 적용 완료 (Vercel 자동 SSL)
- [x] SSL/TLS 인증서 자동 적용
- [x] HTTP → HTTPS 리다이렉트
- [x] HSTS 헤더 설정

#### 📝 Middleware 설정
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

  // 보안 헤더 추가
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

### CORS 설정

#### 📝 추천 설정
```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
        ],
      },
    ];
  },
};
```

#### 📋 체크리스트
- [ ] CORS 정책 설정
- [ ] CSP (Content Security Policy) 설정
- [ ] DDoS 방어 (Cloudflare)
- [ ] Rate Limiting 설정

---

## 4. 파일 업로드 보안

### 파일 타입 검증

#### ✅ 적용 완료
```typescript
// lib/upload/fileValidation.ts
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File, type: 'image' | 'document'): {
  valid: boolean;
  message?: string;
} {
  // MIME type 검증
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: '허용되지 않은 파일 형식입니다' };
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, message: '파일 크기는 10MB 이하여야 합니다' };
  }

  return { valid: true };
}
```

#### 📋 체크리스트
- [x] MIME type 화이트리스트
- [x] 파일 크기 제한
- [ ] 파일 확장자 이중 검증
- [ ] 악성 코드 스캔 (ClamAV 또는 AWS S3 Malware Protection)
- [ ] 이미지 메타데이터 제거 (EXIF)

### 파일 저장 보안

#### 📋 체크리스트
- [x] Cloudflare R2 사용 (외부 스토리지)
- [x] 서명된 URL (Signed URL) 사용
- [ ] 파일명 랜덤화 (UUID)
- [ ] 파일 접근 권한 제어
- [ ] 정기적인 불필요한 파일 삭제

---

## 5. API 보안

### 인증 토큰 검증

#### 📝 권장사항
```typescript
// lib/api/authMiddleware.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: '인증이 필요합니다' },
      { status: 401 }
    );
  }

  return session;
}

export async function requireAdmin(req: NextRequest) {
  const session = await requireAuth(req);

  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: '관리자 권한이 필요합니다' },
      { status: 403 }
    );
  }

  return session;
}
```

### Rate Limiting

#### 📝 권장사항
```typescript
// lib/api/rateLimit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1분
});

export function checkRateLimit(identifier: string, limit: number = 10): boolean {
  const tokenCount = (rateLimit.get(identifier) as number) || 0;

  if (tokenCount >= limit) {
    return false; // 제한 초과
  }

  rateLimit.set(identifier, tokenCount + 1);
  return true;
}

// API Route에서 사용
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!checkRateLimit(ip, 10)) {
    return Response.json(
      { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  // ... API 로직
}
```

#### 📋 체크리스트
- [ ] IP 기반 Rate Limiting
- [ ] API 엔드포인트별 제한 설정
- [ ] 브루트 포스 공격 방어
- [ ] CSRF 토큰 검증 (NextAuth 자동)

---

## 6. SEO 차단

### 검색 엔진 인덱싱 차단

#### ✅ 적용 완료

**1) robots.txt**
```txt
# public/robots.txt
User-agent: *
Disallow: /
```

**2) Metadata 설정**
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
```

#### 📋 체크리스트
- [x] robots.txt 설정
- [x] Meta robots 태그 설정
- [ ] Google Search Console에서 인덱싱 제거 요청
- [ ] 시크릿 URL 패턴 사용 (예: /access/{randomKey})

---

## 7. 환경 변수 관리

### 환경 변수 보안

#### ✅ 적용 완료
- [x] .env 파일 .gitignore에 추가
- [x] .env.example 템플릿 제공

#### 📋 체크리스트
- [ ] 민감한 정보 절대 코드에 하드코딩하지 않기
- [ ] Vercel 환경 변수 암호화 저장
- [ ] 정기적인 API 키 로테이션
- [ ] 개발/프로덕션 환경 분리

### 필수 환경 변수

```bash
# 보안 필수
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."  # openssl rand -base64 32

# API 키
NCP_ACCESS_KEY="..."
NCP_SECRET_KEY="..."
RESEND_API_KEY="..."

# 슬랙/텔레그램
SLACK_WEBHOOK_URL="..."
TELEGRAM_BOT_TOKEN="..."
```

---

## 8. 로깅 및 모니터링

### 보안 로그

#### 📝 권장사항
```typescript
// lib/logger.ts
export const securityLogger = {
  loginSuccess: (userId: string, ip: string) => {
    console.info(`[SECURITY] Login success: ${userId} from ${ip}`);
  },
  loginFailure: (email: string, ip: string) => {
    console.warn(`[SECURITY] Login failure: ${email} from ${ip}`);
  },
  suspiciousActivity: (userId: string, action: string, details: any) => {
    console.error(`[SECURITY] Suspicious activity: ${userId} - ${action}`, details);
    // Sentry로 전송
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(`Suspicious activity: ${action}`, {
        level: 'warning',
        extra: { userId, details },
      });
    }
  },
};
```

#### 📋 체크리스트
- [ ] 로그인 시도 기록
- [ ] 실패한 인증 시도 모니터링
- [ ] 관리자 활동 로그
- [ ] 파일 업로드 로그
- [ ] API 에러 로그

### 모니터링

#### 📋 체크리스트
- [ ] Sentry 에러 트래킹
- [ ] Vercel Analytics 활성화
- [ ] 이상 트래픽 감지
- [ ] 정기적인 보안 리포트

---

## 9. 정기 보안 점검

### 월간 체크리스트

- [ ] 의존성 업데이트 (`npm audit`)
- [ ] 보안 패치 적용
- [ ] 로그 분석 (이상 활동 감지)
- [ ] 백업 데이터 확인
- [ ] SSL 인증서 만료일 확인

### 분기별 체크리스트

- [ ] 전체 보안 감사 (Security Audit)
- [ ] 침투 테스트 (Penetration Test)
- [ ] 개인정보 처리 현황 점검
- [ ] 재해복구 계획 테스트
- [ ] 보안 정책 문서 업데이트

---

## 취약점 리포팅

### 보안 이슈 발견 시

1. **즉시 보고**
   - 이메일: security@polarad.co.kr
   - 슬랙: #security-alert

2. **보고 내용**
   - 취약점 설명
   - 재현 방법
   - 영향 범위
   - 권장 조치사항

3. **응급 대응**
   - 관리자 즉시 알림
   - 임시 조치 (서비스 일시 중단 등)
   - 패치 적용
   - 사용자 공지

---

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/database/prototyping-schema-db-push)
- [Vercel Security](https://vercel.com/docs/security)

---

**마지막 업데이트**: 2025-10-25
**다음 보안 점검**: 2025-11-25
