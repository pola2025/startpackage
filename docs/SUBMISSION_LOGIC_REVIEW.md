# 접수 로직 검수 보고서

## 📅 작성일: 2025-01-24

---

## 🎯 검수 범위

1. 사용자 접수 로직 (자료 제출)
2. 관리자 워크플로우 관리 기능
3. 상태 전환 및 알림 시스템
4. API 엔드포인트 간 일관성

---

## 🔴 심각한 문제 (즉시 수정 필요)

### 1. WorkflowLog 스키마 필드 불일치 ⚠️ CRITICAL

**위치**: `app/api/admin/workflows/update.ts:107`

**문제**:
```typescript
await prisma.workflowLog.create({
  data: {
    adminId: session.user.id,  // ❌ 스키마에 없는 필드
    action: `상태 변경: ${currentWorkflow.status} → ${status}`,
    details: JSON.stringify({ 택배회사, 운송장번호 }),  // ❌ metadata로 변경 필요
  },
});
```

**스키마 정의** (schema.prisma:199-223):
```prisma
model WorkflowLog {
  performedBy     String?  // ✅ User ID 또는 Admin ID
  performedByName String?  // ✅ 이름
  metadata        Json?    // ✅ 추가 정보
  action          String   // ✅ 작업 내용
  previousStatus  String?
  newStatus       String
}
```

**영향**:
- 관리자가 워크플로우 상태 변경 시 **서버 크래시**
- 변경 이력이 기록되지 않음

**수정 방법**:
```typescript
await prisma.workflowLog.create({
  data: {
    workflowId,
    performedBy: session.user.id,
    performedByName: session.user.name || "관리자",
    action: "상태변경",
    previousStatus: currentWorkflow.status,
    newStatus: status,
    metadata: { 택배회사, 운송장번호 },
  },
});
```

---

### 2. 워크플로우 중복 생성 로직 🔄

**발생 위치**:
1. `app/api/auth/signup/route.ts:62-69` - 회원가입 시 생성
2. `app/api/submission/route.ts:89-107` - 자료 제출 완료 시 upsert
3. `app/api/submission/request-print/route.ts:55-66` - 인쇄물 요청 시 생성

**문제점**:
- 회원가입 시 이미 워크플로우가 생성됨
- 자료 제출 완료 시 다시 upsert (불필요)
- request-print API는 중복 체크만 하고 실제로 사용되지 않음

**워크플로우 타입 불일치**:
| 위치 | 생성하는 타입 |
|------|--------------|
| signup | 명함, 명찰, 대봉투, 자문계약서 |
| submission | 명함, 명찰, 대봉투, 자문계약서 |
| request-print | 명찰, 명함, 대봉투, 자문계약서 (순서만 다름) |

**권장 사항**:
- ✅ **회원가입 시에만** 워크플로우 생성 (상태: "대기")
- ✅ **자료 제출 완료 시** 상태만 변경 (대기 → 시안중)
- ⚠️ **request-print API 삭제** 또는 용도 변경

---

### 3. submission API의 unique constraint 누락 ⚠️

**위치**: `app/api/submission/route.ts:92`

```typescript
await prisma.workflow.upsert({
  where: {
    userId_type: { userId, type },  // ❌ Prisma에서 에러 발생 가능
  },
```

**문제**:
- `userId`와 `type`의 조합이 unique constraint로 정의되어 있지만
- upsert의 where 조건으로 사용 시 단일 unique 필드가 아니면 에러 가능

**해결책**:
- Prisma 스키마에 이미 `@@unique([userId, type])` 추가되어 있음 ✅
- 하지만 실제 테스트 필요

---

## 🟡 중간 수준 문제

### 4. 알림 시스템 미통합 📢

#### 4-1. 시안 업로드 완료 알림 없음
**위치**: `app/api/admin/upload-design/route.ts:76-84`

시안 업로드 후:
- ✅ 워크플로우 상태 변경 (→ "발주대기")
- ✅ 시안URL, 시안업로드일 저장
- ❌ **사용자 알림 없음**
- ❌ **슬랙 로그 없음**

**추가 필요**:
```typescript
import { handleDesignUpload } from "@/lib/notification/notificationService";

await handleDesignUpload({
  userId: workflow.userId,
  itemName: workflow.type,
  designUrl: fileUrl,
});
```

#### 4-2. 발주 요청 알림 TODO
**위치**: `app/api/workflows/[id]/order/route.ts:51-52`

```typescript
// TODO: 알림 발송 (발주 완료)
// await AutoNotificationSystem.send발주완료알림(...)
```

**추가 필요**:
```typescript
import { handleStateChange } from "@/lib/notification/notificationService";

await handleStateChange({
  userId,
  fromState: "발주대기",
  toState: "발주완료",
});
```

#### 4-3. 관리자 워크플로우 업데이트 알림 불완전
**위치**: `app/api/admin/workflows/update.ts:113-136`

현재:
- ✅ SMS 발송 (택배 정보 입력 시)
- ❌ 텔레그램 알림 없음
- ❌ 슬랙 로그 없음
- ❌ 상태 변경 알림 없음

---

### 5. 상태 전환 검증 로직 부재 🚦

**StateManager에 정의된 규칙** (lib/workflow/stateManager.ts:128-137):
```typescript
export const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  자료제출중: ["제작진행중"],
  제작진행중: ["시안확인", "자료제출중"],
  시안확인: ["발주요청", "제작진행중"],
  발주요청: ["제작완료"],
  제작완료: [],
};
```

**하지만 실제 API에서는**:
- ❌ `admin/workflows/update.ts` → 어떤 상태든 자유롭게 변경 가능
- ⚠️ `workflows/[id]/order.ts` → "발주대기"만 체크

**권장**:
```typescript
import { StateManager } from "@/lib/workflow/stateManager";

if (!StateManager.canTransition(currentWorkflow.status, status)) {
  return NextResponse.json(
    { error: `${currentWorkflow.status}에서 ${status}로 변경할 수 없습니다` },
    { status: 400 }
  );
}
```

---

### 6. 수정 횟수 추적 로직 없음 🔢

**스키마** (schema.prisma:181):
```prisma
수정횟수 Int @default(0)
```

**PrintItemStateManager에 함수 있음** (stateManager.ts:292-309):
- `canRequestRevision(수정횟수)` - 수정 가능 여부
- `getRevisionCost(수정횟수)` - 추가 비용 계산

**하지만**:
- ❌ 실제로 수정 횟수를 증가시키는 로직 없음
- ❌ 시안 재업로드 시 카운트 안 됨

---

## 🟢 개선 권장 사항

### 7. 파일 업로드 검증 미흡 📁

#### 7-1. 이미지 크기 검증 TODO
**위치**: `app/api/upload/route.ts:33-35`

```typescript
if (field === "프로필사진URL" && file.type.startsWith("image/")) {
  // TODO: 이미지 크기 검증 (1000px 이하)
}
```

**구현 필요**:
```typescript
import sharp from 'sharp';

const metadata = await sharp(buffer).metadata();
if (metadata.width > 1000 || metadata.height > 1000) {
  return NextResponse.json(
    { error: "프로필 사진은 1000px 이하여야 합니다" },
    { status: 400 }
  );
}
```

#### 7-2. 파일 타입 검증 부재
현재: 파일 크기만 체크 (10MB)

추가 필요:
```typescript
const allowedTypes = {
  "프로필사진URL": ["image/jpeg", "image/png", "image/jpg"],
  "사업자등록증URL": ["image/jpeg", "image/png", "application/pdf"],
};

if (!allowedTypes[field]?.includes(file.type)) {
  return NextResponse.json({ error: "지원하지 않는 파일 형식입니다" }, { status: 400 });
}
```

#### 7-3. 파일명 Sanitization 부재
현재: 사용자가 업로드한 파일명 그대로 사용

보안 문제:
- Path traversal 공격 가능
- 특수문자로 인한 파일 시스템 오류

---

### 8. 에러 로깅 개선 📝

현재:
```typescript
console.error("POST /api/submission error:", error);
```

권장:
```typescript
console.error("[SUBMISSION_ERROR]", {
  timestamp: new Date().toISOString(),
  userId,
  error: error.message,
  stack: error.stack,
});
```

---

## 📊 전체 워크플로우 상태 흐름 (수정 후)

```
[1. 회원가입] (signup/route.ts)
   ↓
워크플로우 생성: "대기"
알림: 텔레그램 (관리자) ✅

[2. 자료 제출 중] (submission/route.ts - POST)
   ↓
사용자가 필수 항목 입력
자동 저장

[3. 자료 제출 완료] (submission/route.ts)
   ↓
isComplete = true
워크플로우 상태: "대기" → "시안중"
알림:
  - 슬랙 채널 생성 (기수명_이름_브랜드명) ✅
  - 슬랙 제작정보 푸시 ✅
  - 텔레그램 (관리자) ✅

[4. 관리자: 시안 업로드] (admin/upload-design/route.ts)
   ↓
워크플로우 상태: "시안중" → "발주대기"
시안URL, 시안업로드일 저장
알림:
  - 텔레그램 (사용자) ⚠️ 추가 필요
  - 슬랙 로그 ⚠️ 추가 필요

[5. 사용자: 시안 확인 및 발주 요청] (workflows/[id]/order/route.ts)
   ↓
워크플로우 상태: "발주대기" → "발주완료"
발주요청일, 발주승인일 저장
알림:
  - 텔레그램 (사용자 + 관리자) ⚠️ 추가 필요
  - 슬랙 로그 ⚠️ 추가 필요

[6. 관리자: 제작 완료] (admin/workflows/update.ts)
   ↓
워크플로우 상태: "발주완료" → "제작완료"
제작완료일 자동 저장
알림:
  - 텔레그램 (사용자) ⚠️ 추가 필요
  - 슬랙 로그 ⚠️ 추가 필요

[7. 관리자: 택배 정보 입력] (admin/workflows/update.ts)
   ↓
워크플로우 상태: "제작완료" → "발송완료"
택배회사, 운송장번호, 발송일 저장
알림:
  - SMS (사용자) ✅
  - 텔레그램 (사용자) ⚠️ 추가 필요
  - 슬랙 로그 ⚠️ 추가 필요
```

---

## 🛠️ 수정 우선순위

### Priority 1: 시스템 크래시 방지 (즉시)
- [ ] WorkflowLog adminId → performedBy 수정
- [ ] WorkflowLog details → metadata 수정

### Priority 2: 알림 시스템 완성 (높음)
- [ ] 시안 업로드 시 알림 추가
- [ ] 발주 요청 시 알림 추가
- [ ] 상태 변경 시 슬랙 로그 추가

### Priority 3: 로직 중복 제거 (중간)
- [ ] submission API 워크플로우 생성 로직 제거
- [ ] request-print API 삭제 또는 용도 변경

### Priority 4: 검증 로직 강화 (중간)
- [ ] 상태 전환 검증 추가
- [ ] 수정 횟수 추적 로직 추가

### Priority 5: 개선 사항 (낮음)
- [ ] 이미지 크기 검증 구현
- [ ] 파일 타입 검증 추가
- [ ] 파일명 sanitization
- [ ] 에러 로깅 개선

---

## 📁 수정 대상 파일 목록

### 즉시 수정
1. `app/api/admin/workflows/update.ts` - WorkflowLog 필드 수정 + 알림 추가
2. `app/api/admin/upload-design/route.ts` - 알림 추가
3. `app/api/workflows/[id]/order/route.ts` - 알림 추가

### 로직 개선
4. `app/api/submission/route.ts` - 워크플로우 upsert 제거, 상태 변경만
5. `app/api/submission/request-print/route.ts` - 삭제 검토

### 검증 강화
6. `app/api/admin/workflows/update.ts` - 상태 전환 검증 추가
7. `app/api/upload/route.ts` - 파일 검증 강화

---

## ✅ 테스트 체크리스트

### 접수 흐름 테스트
- [ ] 회원가입 → 워크플로우 4개 생성 확인
- [ ] 자료 제출 → 슬랙 채널 생성 확인
- [ ] 자료 제출 → 텔레그램 알림 확인
- [ ] 자료 제출 → 워크플로우 상태 "시안중" 확인

### 관리자 기능 테스트
- [ ] 시안 업로드 → 상태 "발주대기" 확인
- [ ] 시안 업로드 → 사용자 알림 확인
- [ ] 시안 업로드 → 슬랙 로그 확인
- [ ] 상태 변경 → WorkflowLog 생성 확인 (에러 없이)

### 발주 흐름 테스트
- [ ] 사용자 발주 요청 → 상태 "발주완료" 확인
- [ ] 사용자 발주 요청 → 알림 확인
- [ ] 관리자 제작 완료 → 상태 변경 확인
- [ ] 택배 정보 입력 → SMS 발송 확인

---

## 📌 참고 문서

- [알림 시스템 가이드](./NOTIFICATION_SYSTEM.md)
- [워크플로우 상태 관리](../lib/workflow/stateManager.ts)
- [Prisma 스키마](../prisma/schema.prisma)
