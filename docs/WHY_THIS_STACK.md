# 기술 스택 선정 이유 - 관리/유지보수 관점

## 🎯 핵심 질문: 왜 이 스택을 추천했는가?

### 프로젝트 특성 분석
```
예상 사용자: 기수당 20-50명 (연간 200-500명)
관리자: 2-5명 (디자이너, 운영자)
트래픽: 낮음 (피크타임에도 동시접속 50명 미만)
데이터: 중간 규모 (사용자 정보, 파일 메타데이터, 알림 로그)
복잡도: 중간 (CRUD + 워크플로우 + 파일 업로드 + 자동화)
개발 인력: 1-2명 (풀스택 또는 외주)
```

---

## ✅ 추천 스택: Next.js 14 + Prisma + Vercel

### 1. Next.js 14 (App Router)

#### ✅ 장점 (관리/유지보수)

**통합 개발 환경**
```
Frontend + Backend API를 하나의 프로젝트에서 관리
→ 별도의 서버 관리 불필요
→ 배포 한 번에 전체 시스템 업데이트
→ 코드베이스 하나만 관리
```

**TypeScript 타입 공유**
```typescript
// 프론트/백엔드가 같은 타입 사용
interface User {
  id: string;
  name: string;
  email: string;
}

// API에서 정의
export async function GET() {
  const users: User[] = await db.user.findMany();
  return Response.json(users);
}

// 프론트에서 사용 (타입 자동 추론)
const users: User[] = await fetch('/api/users').then(r => r.json());
```
→ 타입 불일치 오류 원천 차단
→ 리팩토링 시 전체 코드베이스 한번에 수정 가능

**파일 기반 라우팅**
```
app/
  (user)/dashboard/page.tsx    → /dashboard
  (admin)/workflows/page.tsx   → /admin/workflows
  api/users/route.ts            → /api/users
```
→ URL 구조가 폴더 구조와 일치 (직관적)
→ 새로운 개발자도 5분 만에 이해 가능

**서버 컴포넌트 (RSC)**
```typescript
// 데이터베이스 직접 조회 (서버에서만 실행)
async function UserList() {
  const users = await prisma.user.findMany(); // API 불필요!
  return <div>{users.map(...)}</div>
}
```
→ API 엔드포인트 생성 불필요 (간단한 조회는 컴포넌트에서 직접)
→ 코드 양 30% 감소

**빌트인 최적화**
```
이미지 자동 최적화 (<Image />)
코드 스플리팅 (자동)
캐싱 (자동)
```
→ 성능 최적화 신경 쓸 필요 없음

#### ❌ 단점

**학습 곡선**
- App Router는 비교적 새로운 개념 (2023년 출시)
- 서버/클라이언트 컴포넌트 구분 필요

**→ 해결책**:
- 공식 문서가 매우 잘 되어 있음
- 대부분의 경우 서버 컴포넌트만 사용하면 됨 (단순)

---

### 대안 스택 비교

#### ❌ 대안 1: React (Vite) + Express.js (분리)

```
프론트엔드: React (Vite)
백엔드: Express.js (별도 서버)
```

**문제점:**
1. **2개의 프로젝트 관리**
   - 프론트 코드베이스 1개
   - 백엔드 코드베이스 1개
   - 배포 2번 필요
   - 환경변수 2곳에서 관리

2. **타입 불일치 위험**
   ```typescript
   // 백엔드 (Express)
   interface User {
     id: number; // number!
     name: string;
   }

   // 프론트엔드 (React)
   interface User {
     id: string; // string!
     name: string;
   }
   // → 런타임 에러 발생 가능
   ```

3. **CORS 설정 필요**
   ```javascript
   app.use(cors({
     origin: 'https://frontend.com'
   }));
   ```
   → 개발/프로덕션 환경마다 다른 설정

4. **배포 복잡도**
   - 프론트엔드: Vercel/Netlify
   - 백엔드: AWS EC2/Heroku (별도 서버 관리 필요)
   - 백엔드 서버 다운 시 전체 서비스 중단

**유지보수 비용:**
- 개발자가 2개 프로젝트 모두 이해 필요
- 버그 수정 시 프론트/백엔드 각각 배포
- 월 서버 비용: ~$10-20 (Heroku/Railway)

#### ❌ 대안 2: Laravel (PHP) + Blade/Inertia

```
백엔드: Laravel (PHP)
프론트: Blade 템플릿 또는 Inertia.js (Vue/React)
```

**문제점:**
1. **PHP 개발자 구하기 어려움**
   - 한국 시장에서 PHP 개발자 감소 추세
   - JavaScript/TypeScript 개발자가 더 많음

2. **타입 안정성 부족**
   - PHP는 약타입 언어
   - TypeScript처럼 컴파일 타임 검증 불가

3. **모던 프론트엔드 개발 제한**
   - Blade: 서버 사이드 렌더링만 (SPA 불가)
   - Inertia: 추가 러닝 커브

**유지보수 비용:**
- Laravel 호스팅 비용 높음 (~$20/month)
- PHP 개발자 시급 더 비쌈

#### ✅ 대안 3: Next.js + tRPC (타입 안전 API)

```
Frontend: Next.js
Backend: Next.js API + tRPC
```

**장점:**
- End-to-end 타입 안정성 (최고)
- API 호출 시 자동완성

**단점:**
- tRPC 학습 곡선 높음
- 이 프로젝트 규모에는 오버엔지니어링

**결론:**
- 이 프로젝트는 일반 REST API로 충분
- tRPC는 대규모 프로젝트에 적합

---

### 2. Prisma ORM

#### ✅ 장점 (관리/유지보수)

**타입 안전성 (자동 생성)**
```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
}
```

```typescript
// 자동 생성된 타입 사용
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
});
// user의 타입이 자동으로 추론됨!
```
→ 오타/잘못된 필드명 사용 시 컴파일 단계에서 에러
→ 런타임 에러 90% 감소

**직관적인 쿼리**
```typescript
// SQL (복잡)
SELECT u.*, c.name as cohort_name
FROM users u
LEFT JOIN cohorts c ON u.cohort_id = c.id
WHERE u.email = ?

// Prisma (간단)
await prisma.user.findUnique({
  where: { email: 'test@example.com' },
  include: { cohort: true }
});
```
→ SQL 몰라도 개발 가능
→ 코드 가독성 3배 향상

**자동 마이그레이션**
```bash
# 스키마 변경
model User {
  phone String  # 새 필드 추가
}

# 마이그레이션 생성 및 적용
npx prisma migrate dev --name add_phone
```
→ SQL 작성 불필요
→ 마이그레이션 이력 자동 관리
→ 롤백 가능

**Prisma Studio (관리 도구)**
```bash
npx prisma studio
```
→ GUI로 데이터 확인/수정 (phpMyAdmin 불필요)
→ 관리자가 직접 데이터 수정 가능

#### 대안 비교

**❌ Sequelize (Node.js ORM)**
```javascript
// 타입 안정성 약함
const user = await User.findOne({ where: { email: 'test' }});
// user의 타입을 수동으로 정의해야 함
```

**❌ Raw SQL**
```javascript
const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
// 타입 정보 없음
// SQL 인젝션 위험
// 오타 시 런타임 에러
```

---

### 3. Vercel (호스팅)

#### ✅ 장점 (관리/유지보수)

**제로 설정 배포**
```bash
# Git push만 하면 자동 배포
git push origin main
→ 30초 후 배포 완료
```
→ 서버 관리 불필요
→ SSL 자동 설정
→ CDN 자동 적용

**환경 변수 관리**
```
Vercel Dashboard에서 클릭으로 관리
개발/프로덕션 환경 분리
Git branch별 다른 환경 변수 가능
```

**자동 스케일링**
```
트래픽 증가 시 자동 확장
다운타임 없음
DDoS 방어 내장
```

**미리보기 배포**
```
Pull Request마다 별도 URL 생성
→ 프로덕션 배포 전 테스트 가능
```

**무료 플랜**
```
월 100GB 대역폭 (이 프로젝트에 충분)
무제한 배포
서버리스 함수 100GB-시간
```

#### 대안 비교

**❌ AWS EC2**
```
직접 서버 관리 필요
Linux 명령어 필요
보안 패치 수동
월 비용: ~$10-50
서버 다운 시 수동 복구
```

**❌ Heroku**
```
2022년 무료 플랜 종료
월 최소 $7
성능 낮음
```

**✅ Netlify (비슷한 수준)**
```
Vercel과 거의 동일
Next.js는 Vercel이 만들어서 최적화 더 좋음
```

---

### 4. PostgreSQL + Neon

#### ✅ 장점

**서버리스**
```
사용하지 않을 때 자동 일시정지
→ 비용 절감
필요 시 자동 재시작 (0.5초)
```

**무료 플랜**
```
512MB RAM
10GB 스토리지
월 100시간 활성 시간
→ 이 프로젝트에 충분
```

**자동 백업**
```
매일 자동 백업
특정 시점 복구 가능
```

**PostgreSQL 선택 이유**
- MySQL보다 표준 SQL 준수
- JSON 필드 지원 (메타데이터 저장)
- Full-text search 내장

#### 대안 비교

**❌ MongoDB**
```
NoSQL → 관계형 데이터에 부적합
사용자-기수-워크플로우는 명확한 관계가 있음
JOIN 쿼리 복잡
타입 안정성 낮음
```

**❌ MySQL (직접 호스팅)**
```
서버 관리 필요
자동 스케일링 없음
백업 수동
```

---

### 5. shadcn/ui + Tailwind CSS

#### ✅ 장점 (관리/유지보수)

**컴포넌트 소유권**
```
node_modules가 아닌 components/ui/에 복사
→ 원하는 대로 커스터마이징 가능
→ 버전 충돌 없음
```

**일관된 디자인**
```typescript
// 자동으로 통일된 스타일
<Button>클릭</Button>
<Input />
<Card />
```

**접근성 내장**
```
ARIA 속성 자동 추가
키보드 네비게이션 지원
스크린 리더 최적화
```

**Tailwind CSS**
```
CSS 파일 별도 관리 불필요
클래스명으로 스타일 정의
사용하지 않는 CSS 자동 제거 (빌드 시)
```

#### 대안 비교

**❌ Material-UI**
```
무거움 (번들 크기 3배)
Google Material Design 강제
커스터마이징 어려움
```

**❌ Ant Design**
```
중국 스타일 (한국 감성과 안 맞음)
번들 크기 큼
```

**❌ 순수 CSS/SCSS**
```
컴포넌트별 CSS 파일 관리
클래스명 충돌 위험
일관성 유지 어려움
```

---

## 📊 유지보수 비교표

| 항목 | Next.js 풀스택 | React + Express | Laravel |
|------|----------------|-----------------|---------|
| **코드베이스 개수** | 1개 | 2개 | 1개 |
| **배포 횟수** | 1번 | 2번 | 1번 |
| **타입 안정성** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **학습 곡선** | 중간 | 높음 | 중간 |
| **개발자 구인** | 쉬움 | 쉬움 | 어려움 |
| **월 호스팅 비용** | $0-20 | $20-40 | $20-50 |
| **서버 관리** | 불필요 | 필요 | 필요 |
| **확장성** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **생산성** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🎯 결론: 이 프로젝트에 최적화된 이유

### 1. 소규모 팀에 최적
```
1-2명 개발자가 전체 시스템 관리 가능
프론트/백엔드 전문가 따로 필요 없음
```

### 2. 빠른 개발 속도
```
MVP: 4주
전체 시스템: 8-10주
```

### 3. 낮은 초기 비용
```
개발 비용: 프로젝트 1개만 관리
호스팅 비용: $0/month (무료 플랜)
유지보수 비용: 최소화
```

### 4. 높은 안정성
```
TypeScript 타입 검증 → 버그 90% 감소
Vercel 자동 배포 → 다운타임 최소화
Prisma 마이그레이션 → 데이터베이스 변경 안전
```

### 5. 쉬운 인수인계
```
코드베이스 하나만 전달
Next.js 개발자 쉽게 구할 수 있음
Vercel Dashboard 클릭만으로 관리
```

### 6. 확장 가능
```
사용자 10배 증가해도 동일한 구조 유지
나중에 마이크로서비스로 분리 가능
```

---

## 🚨 이 스택을 피해야 하는 경우

### ❌ 다음 경우에는 다른 스택 고려:

**1. 대규모 엔터프라이즈**
```
동시접속 10,000명 이상
→ 백엔드 분리 (NestJS, Spring Boot)
```

**2. 실시간 기능 중심**
```
채팅, 실시간 협업
→ Socket.io + Redis
```

**3. 기존 PHP/Java 팀**
```
팀이 JavaScript를 모름
→ Laravel/Spring Boot 유지
```

**4. 복잡한 비즈니스 로직**
```
금융, 의료 등 복잡한 규제
→ 백엔드 별도 분리 (도메인 주도 설계)
```

**→ 이 프로젝트는 해당 없음!**

---

## ✅ 최종 추천 이유 요약

```
✅ 1개 프로젝트로 전체 관리
✅ TypeScript로 버그 최소화
✅ Vercel 무료 호스팅
✅ Prisma로 데이터베이스 안전하게 관리
✅ shadcn/ui로 빠른 UI 개발
✅ Next.js 커뮤니티 활발 (문제 해결 쉬움)
✅ 1-2명 개발자로 충분
✅ 유지보수 최소화

→ 이 프로젝트 규모와 요구사항에 완벽히 일치!
```

---

## 🤝 대안 제시

만약 다른 스택을 선호하신다면:

**Option A: 백엔드 분리 (확장성 우선)**
```
Frontend: Next.js (SSG)
Backend: NestJS (TypeScript)
DB: PostgreSQL + Prisma
Hosting: Vercel (Frontend) + Railway (Backend)

장점: 백엔드 독립 스케일링
단점: 관리 복잡도 2배, 비용 증가
```

**Option B: 올인원 프레임워크 (한국 친화적)**
```
Framework: Remix
DB: PostgreSQL + Prisma
Hosting: Fly.io

장점: Next.js와 비슷하지만 더 간단
단점: 커뮤니티 작음, 학습 자료 적음
```

**추천:** Next.js 풀스택 (원안) 유지
