-- 사용자 상태 데이터 변환
-- Step 1: isGraduated 값을 status로 변환

BEGIN;

-- isGraduated = false → status = 'active'
UPDATE "users"
SET "status" = 'active'
WHERE "isGraduated" = false AND "status" IS NULL;

-- isGraduated = true → status = 'graduated'
UPDATE "users"
SET "status" = 'graduated',
    "graduatedAt" = NOW()
WHERE "isGraduated" = true AND "status" IS NULL;

-- 검증: 모든 사용자에게 status가 설정되었는지 확인
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'OK: 모든 사용자에게 status가 설정되었습니다'
    ELSE 'ERROR: ' || COUNT(*) || '명의 사용자에게 status가 없습니다'
  END as validation_result
FROM "users"
WHERE "status" IS NULL;

COMMIT;

-- 결과 확인
SELECT
  "status",
  COUNT(*) as count
FROM "users"
GROUP BY "status"
ORDER BY "status";
