# 🚀 배포 퀵 스타트 가이드

> 5분 만에 프로덕션 배포하기

**도메인**: https://polaai.co.kr
**작성일**: 2025-10-25

---

## ⚡ 빠른 배포 (5 Steps)

### Step 1: GitHub 저장소 생성 및 푸시
```bash
# Git 초기화
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 스타트패키지 시스템"

# GitHub 저장소 생성 및 푸시
gh repo create startpackage --private --source=. --remote=origin --push
```

### Step 2: Vercel 프로젝트 생성
```bash
# Vercel 로그인
vercel login

# 프로젝트 초기화
vercel

# 질문 답변:
# ? Set up and deploy? Y
# ? Which scope? [your-team]
# ? Link to existing project? N
# ? Project name? startpackage
# ? In which directory is your code? ./
# ? Modify settings? N
```

### Step 3: 환경 변수 등록
```bash
# 필수 환경 변수 등록
vercel env add DATABASE_URL production
# 입력: postgresql://user:password@host/db?sslmode=require

vercel env add NEXTAUTH_SECRET production
# 입력: openssl rand -base64 32 결과값

vercel env add NEXTAUTH_URL production
# 입력: https://polaai.co.kr

vercel env add NEXT_PUBLIC_APP_URL production
# 입력: https://polaai.co.kr

vercel env add NCP_SERVICE_ID production
vercel env add NCP_ACCESS_KEY production
vercel env add NCP_SECRET_KEY production
vercel env add NCP_SENDER_PHONE production

vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
# 입력: noreply@polaai.co.kr
```

### Step 4: 데이터베이스 마이그레이션
```bash
# 프로덕션 DB에 마이그레이션
DATABASE_URL="프로덕션 URL" npx prisma migrate deploy

# Prisma Client 생성
npx prisma generate
```

### Step 5: 프로덕션 배포
```bash
# 배포 실행
vercel --prod

# 배포 완료 후 URL 확인
# ✓ Production: https://startpackage-xxx.vercel.app
```

---

## 🌐 커스텀 도메인 연결

### DNS 설정 (후이즈 기준)
```
[레코드 1 - 루트 도메인]
레코드 타입: A
호스트명: (빈칸) 또는 polaai.co.kr
레코드 값: 76.76.21.21
TTL: 3600

[레코드 2 - www 서브도메인]
레코드 타입: CNAME
호스트명: www
레코드 값: cname.vercel-dns.com
TTL: 3600
```

**중요**:
- 루트 도메인(polaai.co.kr)은 반드시 **A 레코드**를 사용해야 합니다
- 호스트명에 "@" 대신 **빈칸**을 입력하세요
- Vercel IP: `76.76.21.21`

### Vercel에 도메인 추가
```bash
vercel domains add polaai.co.kr
vercel domains add www.polaai.co.kr
```

---

## ✅ 배포 후 확인사항

### 1. 사이트 접속 확인
```bash
# 브라우저에서 확인
https://polaai.co.kr
https://www.polaai.co.kr (→ https://polaai.co.kr 리다이렉트)
```

### 2. 기본 기능 테스트
- [ ] 홈페이지 로딩
- [ ] 로그인 페이지 (`/login`)
- [ ] 회원가입 페이지 (`/signup`)
- [ ] 관리자 로그인 (`/admin/login`)
- [ ] robots.txt 확인 (`/robots.txt`)

### 3. 데이터베이스 확인
```bash
# Prisma Studio로 확인
DATABASE_URL="프로덕션 URL" npx prisma studio
```

- [ ] 기수 데이터 존재
- [ ] 관리자 계정 존재

### 4. 로그 확인
```bash
# 실시간 로그
vercel logs --follow
```

---

## 🔧 트러블슈팅

### 빌드 실패 시
```bash
# 로컬에서 빌드 테스트
npm run build

# 에러 수정 후
git add .
git commit -m "Fix build errors"
git push
```

### 환경 변수 문제
```bash
# 등록된 환경 변수 확인
vercel env ls

# 누락된 변수 추가
vercel env add [VAR_NAME] production
```

### 데이터베이스 연결 실패
```bash
# DATABASE_URL 확인
vercel env ls | grep DATABASE

# Prisma Client 재생성
npx prisma generate

# 재배포
vercel --prod
```

---

## 📚 상세 문서

더 자세한 내용은 다음 문서를 참조하세요:

- **배포 가이드**: `docs/DEPLOYMENT_GUIDE.md`
- **도메인 설정**: `docs/DOMAIN_SETUP.md`
- **프로덕션 체크리스트**: `docs/PRODUCTION_CHECKLIST.md`
- **보안 체크리스트**: `docs/SECURITY_CHECKLIST.md`

---

## 🎉 배포 완료!

프로덕션 URL: **https://polaai.co.kr**

다음 단계:
1. 초기 기수 데이터 생성
2. 관리자 계정 생성
3. 알림 시스템 테스트 (SMS, 이메일)
4. Cron Job 확인
5. 팀원에게 공유

**배포를 축하합니다! 🎊**
