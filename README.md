# 🚀 비즈액터스쿨 스타트패키지 시스템

> 교육생 자료 제출 및 제작 진행 관리 플랫폼

**버전**: 1.0.0
**상태**: 프로덕션 준비 완료
**프로덕션 URL**: https://polaai.co.kr
**작성일**: 2025-10-25

---

## 📋 프로젝트 개요

비즈액터스쿨 교육생들이 인쇄물, 마케팅, 홈페이지 제작에 필요한 자료를 온라인으로 제출하고, 제작 진행 상황을 실시간으로 확인할 수 있는 통합 관리 시스템입니다.

### 핵심 기능

#### 👤 사용자 (교육생)
- ✅ 기수별 회원가입 및 로그인
- ✅ 자료 제출 (사업자등록증, 프로필사진, 브랜드 정보 등)
- ✅ 워크플로우 상태 확인 (명함, 명찰, 자문계약서, 대봉투)
- ✅ 시안 확인 및 피드백 작성
- ✅ 발주 요청 및 택배 추적
- ✅ 커뮤니케이션 (1:1 문의)
- ✅ 마케팅 지원 기간 연장 신청
- ✅ 공지사항 및 마케팅 소식 확인

#### 👨‍💼 관리자
- ✅ 기수 관리 (생성, 수정, 삭제)
- ✅ 사용자 관리 (조회, 필터, CSV 내보내기)
- ✅ 워크플로우 관리 (시안 업로드, 상태 변경)
- ✅ 택배 정보 입력 및 발송 처리
- ✅ 커뮤니케이션 (답변 작성, 완료 예상일 설정)
- ✅ 알림 발송 (SMS, 이메일)
- ✅ 공지사항 작성 및 관리
- ✅ 관리자 가입 신청 승인/거부

#### 🔔 자동 알림 시스템
- ✅ 회원가입 완료 알림
- ✅ 2주차 미제출 알림 (요일별)
- ✅ 마감일 알림 (D-7, D-3, D-1)
- ✅ 시안 완료 알림
- ✅ 발주 완료 알림
- ✅ 발송 완료 알림
- ✅ 슬랙/텔레그램 관리자 알림

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand, React Query
- **Form**: React Hook Form + Zod

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5

### External Services
- **SMS**: NCP SENS (네이버 클라우드)
- **Email**: Resend
- **File Storage**: Cloudflare R2
- **Deployment**: Vercel
- **Monitoring**: Sentry (옵션)

---

## 📁 프로젝트 구조

```
startpackage/
├── app/
│   ├── (auth)/                 # 인증 페이지
│   │   ├── login/
│   │   └── signup/
│   │
│   ├── dashboard/              # 사용자 대시보드
│   │   ├── submission/         # 자료 제출
│   │   ├── workflow/           # 워크플로우
│   │   ├── communication/      # 커뮤니케이션
│   │   ├── announcements/      # 공지사항
│   │   └── marketing-support/  # 마케팅 지원
│   │
│   ├── admin/                  # 관리자 대시보드
│   │   ├── (dashboard)/
│   │   │   ├── cohorts/        # 기수 관리
│   │   │   ├── users/          # 사용자 관리
│   │   │   ├── workflows/      # 워크플로우 관리
│   │   │   ├── communication/  # 커뮤니케이션
│   │   │   ├── announcements/  # 공지사항 관리
│   │   │   └── requests/       # 관리자 가입 신청
│   │   └── login/
│   │
│   └── api/
│       ├── auth/               # NextAuth 설정
│       ├── user/               # 사용자 API
│       ├── admin/              # 관리자 API
│       ├── communication/      # 커뮤니케이션 API
│       └── cron/               # Cron Job
│
├── components/
│   ├── ui/                     # shadcn/ui 컴포넌트
│   ├── dashboard/              # 사용자 컴포넌트
│   └── admin/                  # 관리자 컴포넌트
│
├── lib/
│   ├── prisma.ts               # Prisma Client
│   ├── auth.ts                 # NextAuth 설정
│   ├── notification/           # 알림 시스템
│   ├── sms/                    # SMS 발송
│   ├── email/                  # 이메일 발송
│   └── upload/                 # 파일 업로드
│
├── prisma/
│   ├── schema.prisma           # 데이터베이스 스키마
│   └── migrations/
│
└── docs/
    ├── ARCHITECTURE.md         # 시스템 아키텍처
    ├── TECH_STACK.md           # 기술 스택 상세
    ├── ADMIN_DASHBOARD_SPEC.md # 관리자 대시보드 기획
    └── PRODUCTION_CHECKLIST.md # 프로덕션 체크리스트
```

---

## 🗄 데이터베이스 스키마

### 주요 모델

#### Cohort (기수)
- 기수명, 교육 시작일, 교육 요일, 자료 제출 마감일
- 활성화 상태 관리

#### User (사용자)
- 기본 정보 (이름, 이메일, 연락처)
- 기수 연결
- 알림 수신 동의
- 슬랙/텔레그램 채널 ID
- 마케팅 지원 기간 설정

#### Submission (자료 제출)
- 인쇄물: 사업자등록증, 프로필사진
- 브랜드 정보: 브랜드명, 업종, 주소
- 마케팅: 메타광고, 네이버광고, Instagram
- 홈페이지: 스타일, 컬러 컨셉
- 진행 상태 및 완료율

#### Workflow (워크플로우)
- 인쇄물별 진행 상태 (명함, 명찰, 자문계약서, 대봉투)
- 시안 업로드 및 이력 관리
- 발주 및 택배 정보
- 피드백 시스템

#### CommunicationThread & Message
- 1:N 대화형 문의 시스템
- 카테고리별 분류 (홈페이지, 로고, 인쇄물, 일반)
- 완료 예상일 설정

#### Announcement (공지사항)
- 제목, 내용, 이미지, 유튜브 링크
- 발행 상태 관리

---

## 🚀 시작하기

### 1. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/your-repo/startpackage.git
cd startpackage

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DATABASE_URL 등)
```

### 2. 데이터베이스 설정

```bash
# Prisma Client 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:push

# Prisma Studio 실행 (선택)
npm run db:studio
```

### 3. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3005 에서 확인

---

## 📦 배포

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel link

# 환경 변수 설정 (Vercel 대시보드)
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NCP_SERVICE_ID, NCP_ACCESS_KEY, NCP_SECRET_KEY
# - RESEND_API_KEY
# - 기타...

# 배포
vercel --prod
```

### 프로덕션 체크리스트

자세한 내용은 [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md) 참조

---

## 📚 문서

- **아키텍처**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **기술 스택**: [`docs/TECH_STACK.md`](./docs/TECH_STACK.md)
- **관리자 대시보드**: [`docs/ADMIN_DASHBOARD_SPEC.md`](./docs/ADMIN_DASHBOARD_SPEC.md)
- **프로덕션 체크리스트**: [`docs/PRODUCTION_CHECKLIST.md`](./docs/PRODUCTION_CHECKLIST.md)

---

## 🔐 보안

- HTTPS 강제
- bcrypt 비밀번호 해싱
- NextAuth.js 세션 관리
- CORS 정책 설정
- SQL Injection 방지 (Prisma)
- XSS 방지 (React 자동 이스케이프)

---

## 📊 프로젝트 현황

### ✅ 완료된 기능

#### 사용자 기능
- [x] 회원가입 및 로그인
- [x] 자료 제출 (모든 필드)
- [x] 워크플로우 상태 확인
- [x] 시안 확인 및 피드백
- [x] 커뮤니케이션 (문의 작성)
- [x] 공지사항 조회
- [x] 마케팅 지원 연장 신청

#### 관리자 기능
- [x] 기수 관리 (CRUD)
- [x] 사용자 관리 (조회, 필터, CSV)
- [x] 워크플로우 관리 (시안 업로드, 상태 변경)
- [x] 택배 정보 입력
- [x] 커뮤니케이션 (답변 작성, 완료 예상일)
- [x] 공지사항 관리 (작성, 수정, 삭제)
- [x] 관리자 가입 신청 승인

#### 알림 시스템
- [x] NCP SENS SMS 연동
- [x] Resend 이메일 연동
- [x] 슬랙 웹훅 알림
- [x] 텔레그램 봇 알림
- [x] Cron Job (마감일 알림, 2주차 알림)

### 🔄 진행 중

- [ ] 성능 최적화 (이미지 최적화, 캐싱)
- [ ] 에러 핸들링 개선
- [ ] 테스트 코드 작성

### 📅 향후 계획

- [ ] 모바일 앱 (React Native)
- [ ] 실시간 채팅 (Socket.io)
- [ ] 결제 시스템 (추가 옵션)
- [ ] 통계 대시보드 강화

---

## 🐛 이슈 리포팅

이슈가 발생하면 다음 정보를 포함해서 리포트해주세요:

1. 발생 환경 (브라우저, OS)
2. 재현 단계
3. 예상 동작 vs 실제 동작
4. 스크린샷 (선택)
5. 에러 메시지 (선택)

---

## 📞 연락처

**개발팀**
- 이메일: dev@polarad.co.kr
- 슬랙: #startpackage-dev

**긴급 문의**
- 관리자: admin@polarad.co.kr

---

## 📄 라이선스

이 프로젝트는 비즈액터스쿨 전용 시스템입니다.

---

**마지막 업데이트**: 2025-10-25
**작성자**: 폴라애드
