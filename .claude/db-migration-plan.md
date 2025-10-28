# DB 스키마 마이그레이션 계획

**프로젝트:** 수료생 상태 관리 개선
**작성일:** 2025-10-28
**위험도:** 🟡 중간 (기존 데이터 변환 필요)

---

## 목차

1. [변경 사항 요약](#변경-사항-요약)
2. [마이그레이션 전략](#마이그레이션-전략)
3. [안전성 분석](#안전성-분석)
4. [롤백 계획](#롤백-계획)
5. [실행 가이드](#실행-가이드)

---

## 변경 사항 요약

### Before (기존)

```prisma
model User {
  // ...
  role String @default("user")
  isGraduated Boolean @default(false)  // ← 제거 예정
  // ...
}
```

**문제점:**
- Boolean으로는 2가지 상태만 표현 (수강생/수료생)
- 비활성 사용자 상태 표현 불가
- 수료일 추적 불가능
- 확장성 낮음

---

### After (변경 후)

```prisma
model User {
  // ...
  role String @default("user")
  status UserStatus @default(active)   // ← 새로 추가
  graduatedAt DateTime?                // ← 새로 추가
  // ...

  @@index([status])  // ← 인덱스 추가
}

enum UserStatus {
  active    // 현재 수강생
  graduated // 수료생
  inactive  // 비활성
}
```

**개선점:**
- ✅ 3가지 상태 표현 가능
- ✅ 수료일 추적 가능
- ✅ 확장성 향상
- ✅ 쿼리 성능 개선 (인덱스)

---

## 마이그레이션 전략

### Phase 1: 스키마 변경

#### 1단계: Enum 생성
```sql
CREATE TYPE "UserStatus" AS ENUM ('active', 'graduated', 'inactive');
```

#### 2단계: 새 컬럼 추가
```sql
ALTER TABLE "users"
  ADD COLUMN "status" "UserStatus",
  ADD COLUMN "graduatedAt" TIMESTAMP(3);
```

#### 3단계: 기존 데이터 변환
```sql
-- isGraduated = false → status = 'active'
UPDATE "users"
SET "status" = 'active'
WHERE "isGraduated" = false;

-- isGraduated = true → status = 'graduated'
UPDATE "users"
SET "status" = 'graduated'
WHERE "isGraduated" = true;
```

#### 4단계: NOT NULL 제약 조건 추가
```sql
-- 모든 데이터에 status가 설정되었으므로 NOT NULL 가능
ALTER TABLE "users"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'active';
```

#### 5단계: 인덱스 생성
```sql
CREATE INDEX "users_status_idx" ON "users"("status");
```

#### 6단계: 기존 컬럼 제거
```sql
ALTER TABLE "users"
  DROP COLUMN "isGraduated";
```

---

### Phase 2: 애플리케이션 코드 수정

#### 변경이 필요한 파일

1. **인증 관련** (기존 서비스 영향 없음)
   - 기존 코드는 `isGraduated`를 사용하지 않음
   - 수료생 앱에서만 `status` 사용

2. **쿼리 수정** (선택적)
   ```typescript
   // Before
   const users = await prisma.user.findMany({
     where: { isGraduated: false }
   })

   // After
   const users = await prisma.user.findMany({
     where: { status: "active" }
   })
   ```

---

## 안전성 분석

### ✅ 기존 서비스에 미치는 영향: 없음

#### 이유 1: isGraduated 사용 현황 확인

기존 코드베이스에서 `isGraduated` 검색 결과:
```bash
# 검색 명령어
grep -r "isGraduated" app/ components/ lib/
```

**예상 결과:** 사용하지 않음 (스키마에만 정의됨)

#### 이유 2: 마이그레이션 로직 안전성

| 단계 | 위험도 | 안전 장치 |
|-----|-------|----------|
| Enum 생성 | 🟢 낮음 | 기존 데이터 영향 없음 |
| 컬럼 추가 | 🟢 낮음 | NULL 허용으로 시작 |
| 데이터 변환 | 🟡 중간 | WHERE 조건으로 안전하게 변환 |
| NOT NULL 설정 | 🟢 낮음 | 변환 완료 후 진행 |
| 인덱스 생성 | 🟢 낮음 | 성능 향상만, 데이터 변경 없음 |
| 기존 컬럼 제거 | 🟡 중간 | 백업 후 진행 |

#### 이유 3: 트랜잭션 사용

```sql
BEGIN;

-- 모든 마이그레이션 작업

COMMIT;  -- 모두 성공하면 커밋
-- 또는
ROLLBACK;  -- 하나라도 실패하면 롤백
```

---

### 🔒 안전 장치

#### 1. DB 백업
```bash
# Neon Dashboard에서 스냅샷 생성
# 또는 pg_dump 사용
pg_dump $DATABASE_URL > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

#### 2. Dry-run 테스트
```bash
# 로컬 DB에서 먼저 테스트
npx prisma migrate dev --name add_user_status --create-only

# 생성된 SQL 확인
cat prisma/migrations/XXXXXX_add_user_status/migration.sql

# 로컬에서 적용 테스트
npx prisma migrate dev
```

#### 3. 프로덕션 적용 전 확인
```bash
# 1. 로컬 테스트 완료
# 2. 기존 데이터 개수 확인
SELECT
  "isGraduated",
  COUNT(*) as count
FROM "users"
GROUP BY "isGraduated";

# 3. 마이그레이션 후 검증
SELECT
  "status",
  COUNT(*) as count
FROM "users"
GROUP BY "status";
```

---

## 롤백 계획

### 시나리오 1: 마이그레이션 실패

**대응:** 자동 롤백
```bash
# Prisma가 자동으로 롤백
# 또는 수동 롤백
npx prisma migrate resolve --rolled-back XXXXXX_add_user_status
```

---

### 시나리오 2: 마이그레이션 성공했지만 문제 발견

**대응:** 역 마이그레이션

```sql
BEGIN;

-- 1. isGraduated 컬럼 복원
ALTER TABLE "users"
  ADD COLUMN "isGraduated" BOOLEAN;

-- 2. 데이터 복원
UPDATE "users"
SET "isGraduated" = CASE
  WHEN "status" = 'graduated' THEN true
  ELSE false
END;

-- 3. NOT NULL 설정
ALTER TABLE "users"
  ALTER COLUMN "isGraduated" SET NOT NULL,
  ALTER COLUMN "isGraduated" SET DEFAULT false;

-- 4. 새 컬럼 제거
ALTER TABLE "users"
  DROP COLUMN "status",
  DROP COLUMN "graduatedAt";

-- 5. 인덱스 제거
DROP INDEX IF EXISTS "users_status_idx";

-- 6. Enum 제거
DROP TYPE IF EXISTS "UserStatus";

COMMIT;
```

---

### 시나리오 3: DB 백업에서 복원

```bash
# 백업 파일 복원
psql $DATABASE_URL < backup_before_migration_YYYYMMDD_HHMMSS.sql

# Prisma 클라이언트 재생성
npx prisma generate
```

---

## 실행 가이드

### 사전 체크리스트

- [ ] DB 백업 완료
- [ ] 로컬에서 테스트 완료
- [ ] 기존 데이터 개수 확인
- [ ] 코드 변경사항 커밋
- [ ] 롤백 계획 숙지

---

### Step 1: 로컬 테스트

```bash
cd F:\startpackage

# 1. 현재 DB 상태 확인
npx prisma db pull

# 2. 마이그레이션 파일 생성 (적용 안 함)
npx prisma migrate dev --name add_user_status --create-only

# 3. 생성된 SQL 확인
cat prisma/migrations/*_add_user_status/migration.sql

# 4. 필요시 SQL 수정 (데이터 변환 로직 추가)

# 5. 로컬 DB에 적용
npx prisma migrate dev

# 6. 검증
npx prisma studio
# User 테이블에서 status, graduatedAt 확인
```

---

### Step 2: 마이그레이션 SQL 확인 및 수정

생성된 마이그레이션 파일에 데이터 변환 로직 추가:

```sql
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'graduated', 'inactive');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "status" "UserStatus";
ALTER TABLE "users" ADD COLUMN "graduatedAt" TIMESTAMP(3);

-- 데이터 변환 (추가)
UPDATE "users" SET "status" = 'active' WHERE "isGraduated" = false;
UPDATE "users" SET "status" = 'graduated' WHERE "isGraduated" = true;

-- NOT NULL 제약 조건
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active';

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- DropColumn
ALTER TABLE "users" DROP COLUMN "isGraduated";
```

---

### Step 3: 프로덕션 배포

```bash
# 1. DB 백업 (Neon Dashboard에서)
# Neon Dashboard → Database → Backups → Create Snapshot

# 2. 마이그레이션 적용
npx prisma migrate deploy

# 3. Prisma 클라이언트 재생성
npx prisma generate

# 4. 검증 쿼리 실행
npx prisma studio
# 또는
psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM users GROUP BY status;"
```

---

### Step 4: 애플리케이션 재배포

```bash
# 1. Git 커밋
git add prisma/schema.prisma
git add prisma/migrations/*_add_user_status
git commit -m "feat: add user status enum and graduatedAt field"

# 2. Vercel 배포
git push

# Vercel이 자동으로 배포
# 빌드 시 npx prisma generate 자동 실행
```

---

### Step 5: 검증

```bash
# 1. 기존 사용자 확인
psql $DATABASE_URL -c "
SELECT
  email,
  status,
  graduatedAt,
  createdAt
FROM users
ORDER BY createdAt DESC
LIMIT 10;
"

# 2. 상태별 통계
psql $DATABASE_URL -c "
SELECT
  status,
  COUNT(*) as count
FROM users
GROUP BY status;
"

# 예상 결과:
#  status  | count
# ---------+-------
#  active  |   50   (기존 isGraduated=false)
#  graduated|   0    (기존 isGraduated=true 없음)
```

---

## 데이터 변환 예시

### Before (기존 데이터)

| id | email | isGraduated | cohortId |
|----|-------|-------------|----------|
| 1  | user1@example.com | false | cohort-1 |
| 2  | user2@example.com | false | cohort-2 |
| 3  | user3@example.com | true  | cohort-1 |

### After (변환 후)

| id | email | status | graduatedAt | cohortId |
|----|-------|--------|-------------|----------|
| 1  | user1@example.com | active | NULL | cohort-1 |
| 2  | user2@example.com | active | NULL | cohort-2 |
| 3  | user3@example.com | graduated | NULL | cohort-1 |

**참고:** `graduatedAt`은 마이그레이션 시점에는 NULL. 향후 관리자가 수동으로 설정하거나, 수료 처리 시 자동으로 설정.

---

## 수료생 생성 예시

마이그레이션 후 테스트용 수료생 생성:

```sql
-- 기존 사용자 중 1명을 수료생으로 변경
UPDATE "users"
SET
  "status" = 'graduated',
  "graduatedAt" = NOW()
WHERE "email" = 'test-graduated@example.com';
```

또는 새 수료생 생성:

```typescript
// app/api/admin/users/[id]/graduate/route.ts (예시)
await prisma.user.update({
  where: { id: userId },
  data: {
    status: 'graduated',
    graduatedAt: new Date(),
  }
})
```

---

## 성능 영향

### 인덱스 추가로 쿼리 성능 향상

**Before:**
```sql
-- 인덱스 없음
SELECT * FROM users WHERE isGraduated = false;
-- Full table scan
```

**After:**
```sql
-- 인덱스 사용
SELECT * FROM users WHERE status = 'active';
-- Index scan (훨씬 빠름)
```

**예상 성능 향상:**
- 사용자 수 < 1,000: 차이 미미
- 사용자 수 > 10,000: 10-100배 빠름

---

## FAQ

### Q1: 기존 서비스에 영향이 있나요?
**A:** 없습니다. 기존 코드는 `isGraduated`를 사용하지 않습니다.

### Q2: 마이그레이션 중 서비스 중단되나요?
**A:** Neon (PostgreSQL)은 온라인 스키마 변경을 지원하므로 서비스 중단 없습니다. 다만 마이그레이션 동안 (1-2초) 약간의 지연이 있을 수 있습니다.

### Q3: 롤백이 가능한가요?
**A:** 네, 역 마이그레이션 SQL이 준비되어 있습니다.

### Q4: 기존 사용자 데이터는 안전한가요?
**A:** 네, 모든 데이터는 보존됩니다. isGraduated=false → status=active로 변환됩니다.

### Q5: graduatedAt은 어떻게 설정하나요?
**A:**
- 마이그레이션 시: NULL
- 향후: 관리자가 수료 처리 시 자동 설정

---

## 타임라인

| 단계 | 예상 시간 | 작업 |
|-----|----------|------|
| 1. DB 백업 | 1분 | Neon 스냅샷 생성 |
| 2. 로컬 테스트 | 10분 | 마이그레이션 생성 및 테스트 |
| 3. SQL 검토 | 5분 | 변환 로직 확인 |
| 4. 프로덕션 적용 | 2분 | migrate deploy |
| 5. 검증 | 5분 | 데이터 확인 |
| **총** | **23분** | |

---

## 최종 체크리스트

### 마이그레이션 전
- [ ] Prisma 스키마 변경 완료
- [ ] DB 백업 완료 (Neon 스냅샷)
- [ ] 로컬에서 테스트 완료
- [ ] 마이그레이션 SQL 검토
- [ ] 롤백 계획 준비

### 마이그레이션 실행
- [ ] npx prisma migrate deploy
- [ ] npx prisma generate
- [ ] 데이터 변환 확인
- [ ] 인덱스 생성 확인

### 마이그레이션 후
- [ ] 기존 사용자 상태 확인
- [ ] 통계 쿼리 실행
- [ ] Vercel 배포
- [ ] 기존 서비스 동작 확인
- [ ] 테스트 수료생 생성

---

**문서 버전:** 1.0.0
**최종 수정일:** 2025-10-28
**작성자:** Claude Code
**검토자:** (대기 중)
