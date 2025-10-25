# 배포 가이드 (Vercel + GitHub)

> Vercel CLI와 GitHub CLI를 활용한 스타트패키지 배포

**작성일**: 2025-10-25
**버전**: 1.0

---

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [GitHub 저장소 설정](#2-github-저장소-설정)
3. [Vercel 프로젝트 설정](#3-vercel-프로젝트-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [배포 실행](#5-배포-실행)
6. [배포 후 확인](#6-배포-후-확인)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. 사전 준비

### 필수 도구 설치

#### GitHub CLI 설치
```bash
# Windows (scoop 사용)
scoop install gh

# 또는 직접 다운로드
# https://cli.github.com/
```

#### Vercel CLI 설치
```bash
npm install -g vercel
```

#### 설치 확인
```bash
gh --version
# gh version 2.x.x

vercel --version
# Vercel CLI 33.x.x
```

---

## 2. GitHub 저장소 설정

### Step 1: GitHub 로그인
```bash
# GitHub CLI 로그인
gh auth login

# 선택 옵션:
# - GitHub.com
# - HTTPS
# - Login with a web browser
```

### Step 2: 저장소 생성
```bash
# 현재 디렉토리를 Git 저장소로 초기화
git init

# .gitignore 확인
# .env, node_modules, .next 등이 포함되어 있는지 확인
```

**`.gitignore` 확인**
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
prisma/dev.db
prisma/dev.db-journal
```

### Step 3: GitHub 저장소 생성 및 푸시
```bash
# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 스타트패키지 시스템"

# GitHub에 저장소 생성 및 푸시 (한 번에)
gh repo create startpackage --private --source=. --remote=origin --push

# 또는 수동으로:
# gh repo create startpackage --private
# git remote add origin https://github.com/your-username/startpackage.git
# git branch -M main
# git push -u origin main
```

**확인**
```bash
# 저장소 확인
gh repo view

# 브라우저에서 열기
gh repo view --web
```

---

## 3. Vercel 프로젝트 설정

### Step 1: Vercel 로그인
```bash
vercel login
# 브라우저에서 로그인
```

### Step 2: 프로젝트 연결
```bash
# Vercel 프로젝트 초기화
vercel

# 질문에 답변:
# ? Set up and deploy "F:\startpackage"? [Y/n] Y
# ? Which scope do you want to deploy to? [your-team]
# ? Link to existing project? [y/N] N
# ? What's your project's name? startpackage
# ? In which directory is your code located? ./
# ? Want to modify these settings? [y/N] N
```

### Step 3: GitHub 연동 (Vercel Dashboard)

**옵션 1: CLI에서 연동**
```bash
# Vercel에서 자동으로 GitHub 저장소 감지
vercel --prod
```

**옵션 2: 대시보드에서 수동 연동**
1. https://vercel.com/dashboard 접속
2. "Import Project" 클릭
3. GitHub 저장소 선택 (`startpackage`)
4. Framework Preset: **Next.js** 선택
5. Root Directory: `./` (기본값)
6. Build Command: `npm run build` (기본값)
7. Output Directory: `.next` (기본값)

---

## 4. 환경 변수 설정

### 방법 1: Vercel CLI로 환경 변수 등록

```bash
# 프로덕션 환경 변수 추가
vercel env add DATABASE_URL production
# 입력: postgresql://user:password@host/db?sslmode=require

vercel env add NEXTAUTH_SECRET production
# 입력: (openssl rand -base64 32로 생성한 값)

vercel env add NCP_SERVICE_ID production
vercel env add NCP_ACCESS_KEY production
vercel env add NCP_SECRET_KEY production
vercel env add NCP_SENDER_PHONE production

vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production

vercel env add SLACK_BOT_TOKEN production
vercel env add SLACK_WEBHOOK_URL production

vercel env add TELEGRAM_BOT_TOKEN production
vercel env add TELEGRAM_ADMIN_CHAT_ID production

vercel env add NEXT_PUBLIC_APP_URL production
# 입력: https://your-domain.vercel.app
```

### 방법 2: Vercel Dashboard에서 설정

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 (`startpackage`)
3. Settings > Environment Variables
4. 환경 변수 추가:

| Key | Value | Environment |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Production |
| `NEXTAUTH_SECRET` | `(랜덤 값)` | Production |
| `NCP_SERVICE_ID` | `ncp:sms:kr:...` | Production |
| `NCP_ACCESS_KEY` | `ncp_iam_...` | Production |
| `NCP_SECRET_KEY` | `ncp_iam_...` | Production |
| `NCP_SENDER_PHONE` | `010...` | Production |
| `RESEND_API_KEY` | `re_...` | Production |
| `EMAIL_FROM` | `noreply@...` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://...` | Production |

### 환경 변수 확인
```bash
# 등록된 환경 변수 확인
vercel env ls
```

---

## 5. 배포 실행

### Step 1: 데이터베이스 마이그레이션

**프로덕션 DB에 마이그레이션 적용**
```bash
# 프로덕션 DATABASE_URL로 마이그레이션
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Prisma Client 생성
npx prisma generate
```

### Step 2: 프로덕션 배포

```bash
# 프로덕션 배포
vercel --prod

# 배포 진행 상황 확인
# ✓ Deploying to production
# ✓ Building
# ✓ Uploading
# ✓ Running checks
# ✓ Ready
```

### Step 3: 도메인 확인

배포 완료 후 출력되는 URL:
```
https://startpackage-xxx.vercel.app
```

---

## 6. 배포 후 확인

### 체크리스트

#### ✅ 기본 동작 확인
```bash
# 배포된 사이트 열기
vercel --prod --open

# 또는
gh browse
```

**확인 항목:**
- [ ] 홈페이지 로딩
- [ ] 로그인 페이지 접근
- [ ] 회원가입 페이지 접근
- [ ] robots.txt 확인 (`/robots.txt`)
- [ ] API 응답 확인

#### ✅ 데이터베이스 연결 확인
```bash
# Prisma Studio로 프로덕션 DB 확인
DATABASE_URL="postgresql://..." npx prisma studio
```

**확인 항목:**
- [ ] 기수 데이터 존재
- [ ] 관리자 계정 존재
- [ ] 테이블 스키마 정상

#### ✅ Cron Job 확인

**Vercel Dashboard**
1. Settings > Cron Jobs
2. 등록된 Cron 확인:
   - `/api/cron/deadline-reminder` (매일 09:00)
   - `/api/cron/2week-reminder-mon` ~ `fri` (요일별 09:00)

#### ✅ 로그 확인
```bash
# 실시간 로그 확인
vercel logs --follow

# 특정 배포 로그 확인
vercel logs [deployment-url]
```

#### ✅ 성능 확인
```bash
# Lighthouse 테스트
npx lighthouse https://your-domain.vercel.app --view
```

---

## 7. 트러블슈팅

### 문제 1: 빌드 실패

**증상:**
```
Error: Build failed with exit code 1
```

**해결:**
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 확인 후 수정
# 수정 후 다시 배포
git add .
git commit -m "Fix build errors"
git push
```

### 문제 2: 환경 변수 누락

**증상:**
```
Error: DATABASE_URL is not defined
```

**해결:**
```bash
# 환경 변수 확인
vercel env ls

# 누락된 변수 추가
vercel env add DATABASE_URL production
```

### 문제 3: Prisma Client 에러

**증상:**
```
PrismaClientInitializationError: Can't reach database server
```

**해결:**
```bash
# DATABASE_URL 확인
vercel env ls

# Prisma Client 재생성
npx prisma generate

# 재배포
vercel --prod
```

### 문제 4: CORS 에러

**증상:**
```
Access-Control-Allow-Origin error
```

**해결:**
```typescript
// next.config.ts 확인
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*'
          },
        ],
      },
    ];
  },
};
```

### 문제 5: 이미지 로딩 실패

**증상:**
```
Invalid src prop
```

**해결:**
```typescript
// next.config.ts에 remotePatterns 추가
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};
```

---

## 지속적 배포 (CI/CD)

### GitHub Actions 자동 배포 (선택사항)

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npx tsc --noEmit

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

**Secrets 설정:**
```bash
# GitHub Repository Secrets 추가
gh secret set VERCEL_TOKEN
gh secret set ORG_ID
gh secret set PROJECT_ID
```

---

## 롤백

### 이전 배포로 롤백
```bash
# 배포 목록 확인
vercel ls

# 특정 배포로 롤백
vercel rollback [deployment-url]

# 또는 Vercel Dashboard에서:
# Deployments > 이전 배포 선택 > Promote to Production
```

---

## 유용한 명령어

```bash
# 프로젝트 정보 확인
vercel inspect

# 도메인 목록
vercel domains ls

# 도메인 추가
vercel domains add your-domain.com

# 로그 실시간 확인
vercel logs --follow

# 배포 취소
vercel remove [deployment-url]

# GitHub 저장소 확인
gh repo view

# GitHub 이슈 생성
gh issue create

# Pull Request 생성
gh pr create
```

---

## 배포 완료 후 해야 할 일

### 1. 팀 공유
```bash
# Vercel 프로젝트에 팀원 초대
# Vercel Dashboard > Settings > Members > Invite
```

### 2. 도메인 설정 (선택)
```bash
# 커스텀 도메인 연결
vercel domains add startpackage.yourdomain.com
```

### 3. 모니터링 설정
- [ ] Sentry 설정
- [ ] Vercel Analytics 활성화
- [ ] 슬랙/텔레그램 알림 테스트

### 4. 문서 업데이트
- [ ] README.md에 프로덕션 URL 추가
- [ ] 배포 일자 기록
- [ ] 변경 이력 작성

---

## 참고 링크

- **Vercel CLI Docs**: https://vercel.com/docs/cli
- **GitHub CLI Docs**: https://cli.github.com/manual/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Environment Variables**: https://vercel.com/docs/environment-variables

---

**배포 성공을 기원합니다! 🚀**
