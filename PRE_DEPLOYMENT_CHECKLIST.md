# 🚀 프로덕션 배포 전 최종 점검

> **배포 전 필수 확인사항**

**도메인**: https://polaai.co.kr
**버전**: 1.0.0
**작성일**: 2025-10-25

---

## ✅ 시스템 설정 확인

### 1. 프로젝트 파일 검증

- [x] `.gitignore` - Prisma migrations 포함되도록 수정 완료
- [x] `package.json` - 버전 1.0.0으로 업데이트 완료
- [x] `vercel.json` - Cron Jobs 6개 설정 완료
- [x] `next.config.ts` - 이미지 remotePatterns, serverActions 설정 완료
- [x] `robots.txt` - 모든 검색엔진 차단 설정 완료
- [x] `app/layout.tsx` - SEO 메타데이터 noindex/nofollow 설정 완료

### 2. 환경 변수 준비

**필수 환경 변수 목록:**

```bash
# 데이터베이스
DATABASE_URL="postgresql://..." # Neon PostgreSQL

# NextAuth
NEXTAUTH_SECRET="" # openssl rand -base64 32
NEXTAUTH_URL="https://polaai.co.kr"

# 애플리케이션 URL
NEXT_PUBLIC_APP_URL="https://polaai.co.kr"

# NCP SENS (SMS)
NCP_SERVICE_ID="ncp:sms:kr:..."
NCP_ACCESS_KEY="ncp_iam_..."
NCP_SECRET_KEY="ncp_iam_..."
NCP_SENDER_PHONE="010..."

# Resend (Email)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@polaai.co.kr"

# Slack (선택)
SLACK_BOT_TOKEN="xoxb-..."
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# Telegram (선택)
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_ADMIN_CHAT_ID="..."
```

### 3. 데이터베이스 확인

- [ ] Neon PostgreSQL 프로덕션 DB 생성 완료
- [ ] DATABASE_URL 확보
- [ ] 로컬에서 프로덕션 DB 연결 테스트
  ```bash
  DATABASE_URL="프로덕션 URL" npx prisma studio
  ```

---

## 📦 배포 준비

### Step 1: 로컬 빌드 테스트

```bash
# 빌드 테스트
npm run build

# 에러 없이 빌드 완료되는지 확인
# ✓ Compiled successfully
```

**확인사항:**
- [ ] TypeScript 에러 없음
- [ ] 빌드 경고 최소화
- [ ] 페이지 생성 완료

### Step 2: Git 커밋 준비

```bash
# 변경사항 확인
git status

# 확인할 파일:
# - .gitignore (migrations 포함)
# - package.json (v1.0.0)
# - docs/ (모든 배포 문서)
# - QUICKSTART.md
# - README.md (프로덕션 URL 포함)
# - robots.txt
# - app/layout.tsx (SEO 메타데이터)
```

### Step 3: GitHub 저장소 생성 준비

```bash
# GitHub CLI 로그인 확인
gh auth status

# Git 초기화 확인
git status
```

---

## 🔐 보안 최종 점검

### 환경 변수 보안
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] 로컬 `.env` 파일에 실제 값이 있음 (참고용)
- [ ] GitHub에 환경 변수 절대 커밋하지 않음

### 인증 설정
- [ ] NextAuth 세션 전략 확인
- [ ] 비밀번호 bcrypt 해싱 적용
- [ ] HTTPS 강제 (Vercel 자동)

### 데이터 보안
- [ ] Prisma 쿼리로 SQL Injection 방지
- [ ] 사용자 입력 검증 (Zod)
- [ ] XSS 방지 (React 자동)

---

## 🌐 SEO 차단 확인

### robots.txt 설정
```txt
User-agent: *
Disallow: /

User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /
```

### Next.js 메타데이터
```typescript
robots: {
  index: false,
  follow: false,
  nocache: true,
}
```

**테스트:**
- [ ] `/robots.txt` 접근 시 차단 룰 확인
- [ ] 페이지 소스에서 `<meta name="robots" content="noindex,nofollow">` 확인

---

## 📋 Vercel 배포 준비

### vercel.json 확인

**Cron Jobs (6개):**
1. `/api/cron/deadline-reminder` - 매일 09:00
2. `/api/cron/2week-reminder-mon` - 월요일 09:00
3. `/api/cron/2week-reminder-tue` - 화요일 09:00
4. `/api/cron/2week-reminder-wed` - 수요일 09:00
5. `/api/cron/2week-reminder-thu` - 목요일 09:00
6. `/api/cron/2week-reminder-fri` - 금요일 09:00

---

## 🎯 배포 실행 단계

### 1단계: GitHub 저장소 생성
```bash
git init
git add .
git commit -m "Initial commit: 스타트패키지 v1.0.0"
gh repo create startpackage --private --source=. --remote=origin --push
```

### 2단계: Vercel 프로젝트 생성
```bash
vercel login
vercel
# 질문 답변:
# - Set up and deploy? Y
# - Which scope? [your-team]
# - Link to existing project? N
# - Project name? startpackage
# - In which directory is your code? ./
# - Modify settings? N
```

### 3단계: 환경 변수 등록
```bash
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NCP_SERVICE_ID production
vercel env add NCP_ACCESS_KEY production
vercel env add NCP_SECRET_KEY production
vercel env add NCP_SENDER_PHONE production
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
```

### 4단계: 데이터베이스 마이그레이션
```bash
DATABASE_URL="프로덕션 URL" npx prisma migrate deploy
npx prisma generate
```

### 5단계: 프로덕션 배포
```bash
vercel --prod
```

---

## 🧪 배포 후 확인사항

### 기본 동작 테스트
- [ ] https://polaai.co.kr 접속
- [ ] 홈페이지 로딩
- [ ] 로그인 페이지 (`/login`)
- [ ] 회원가입 페이지 (`/signup`)
- [ ] 관리자 로그인 (`/admin/login`)

### 데이터베이스 연결
- [ ] 사용자 생성 테스트
- [ ] Prisma Studio로 프로덕션 DB 확인

### Cron Jobs
- [ ] Vercel Dashboard > Settings > Cron Jobs 확인
- [ ] 6개 Cron 모두 등록되어 있는지 확인

### 알림 시스템
- [ ] 회원가입 시 환영 이메일 발송
- [ ] SMS 발송 테스트 (선택)
- [ ] 슬랙 알림 테스트 (선택)

### 보안 및 SEO
- [ ] HTTPS 적용 확인 (자물쇠 아이콘)
- [ ] `/robots.txt` 접근 확인
- [ ] Google에서 사이트 검색 → 나오지 않아야 함

---

## 📊 배포 완료 후 작업

### 1. 도메인 연결 (polaai.co.kr)
```bash
# DNS 설정 (가비아/Cloudflare)
# CNAME @ → cname.vercel-dns.com
# CNAME www → cname.vercel-dns.com

# Vercel에 도메인 추가
vercel domains add polaai.co.kr
vercel domains add www.polaai.co.kr
```

### 2. Resend 도메인 인증
```bash
# Resend Dashboard에서 polaai.co.kr 도메인 추가
# SPF, DKIM, DMARC 레코드 DNS에 추가
```

### 3. 초기 데이터 설정
- [ ] 첫 번째 기수 생성
- [ ] 관리자 계정 생성
- [ ] 공지사항 작성 (선택)

### 4. 모니터링 설정
- [ ] Vercel Analytics 활성화
- [ ] 에러 로그 모니터링
- [ ] Cron Job 실행 로그 확인

---

## 📞 긴급 연락처

**개발팀**
- 이메일: dev@polarad.co.kr
- 슬랙: #startpackage-dev

**Vercel 문제**
- Vercel Support: https://vercel.com/support

**DB 문제**
- Neon Console: https://console.neon.tech/

---

## 🎉 최종 체크리스트

**배포 전:**
- [ ] 로컬 빌드 테스트 완료
- [ ] 환경 변수 준비 완료
- [ ] 프로덕션 DB 생성 완료
- [ ] GitHub CLI, Vercel CLI 설치 및 로그인

**배포 중:**
- [ ] GitHub 저장소 생성 완료
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경 변수 등록 완료
- [ ] DB 마이그레이션 완료
- [ ] 프로덕션 배포 완료

**배포 후:**
- [ ] 사이트 접속 확인
- [ ] 기본 기능 테스트 완료
- [ ] Cron Jobs 확인
- [ ] 도메인 연결 완료
- [ ] 팀원에게 공유

---

**배포 준비 완료! 🚀**

이 체크리스트를 순서대로 진행하면 안전하게 프로덕션 배포를 완료할 수 있습니다.

다음 문서 참조:
- [`QUICKSTART.md`](./QUICKSTART.md) - 5분 빠른 배포
- [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md) - 상세 배포 가이드
- [`docs/DOMAIN_SETUP.md`](./docs/DOMAIN_SETUP.md) - 도메인 설정
- [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md) - 프로덕션 체크리스트
- [`docs/SECURITY_CHECKLIST.md`](./docs/SECURITY_CHECKLIST.md) - 보안 체크리스트

**작성자**: 폴라애드
**마지막 업데이트**: 2025-10-25
