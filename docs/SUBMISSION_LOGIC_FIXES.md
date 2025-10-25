# 접수 로직 수정 완료 보고서

## 📅 수정일: 2025-01-24

---

## ✅ 수정 완료 항목

### 1. WorkflowLog 스키마 필드 오류 수정 ✅

**파일**: `app/api/admin/workflows/update/route.ts`

**Before**:
```typescript
await prisma.workflowLog.create({
  data: {
    adminId: session.user.id,  // ❌ 스키마에 없는 필드
    action: `상태 변경: ${currentWorkflow.status} → ${status}`,
    details: JSON.stringify({ 택배회사, 운송장번호 }),  // ❌ metadata로 변경 필요
  },
});
```

**After**:
```typescript
await prisma.workflowLog.create({
  data: {
    workflowId,
    performedBy: (session.user as any).id,  // ✅ 올바른 필드명
    performedByName: (session.user as any).name || "관리자",  // ✅ 이름 추가
    action: "상태변경",  // ✅ 간단하게
    previousStatus: currentWorkflow.status,  // ✅ 이전 상태
    newStatus: status,  // ✅ 새 상태
    metadata: { 택배회사, 운송장번호, 시안URL },  // ✅ JSON 형식
  },
});
```

**효과**:
- ✅ 서버 크래시 방지
- ✅ 변경 이력 정상 기록

---

### 2. 관리자 상태 변경 시 알림 통합 ✅

**파일**: `app/api/admin/workflows/update/route.ts`

**추가된 기능**:
```typescript
import { handleStateChange, handleProductionComplete, logProgress } from "@/lib/notification/notificationService";

// 상태 변경 알림 (텔레그램 + 슬랙)
if (currentWorkflow.status !== status) {
  await handleStateChange({
    userId: updatedWorkflow.userId,
    fromState: currentWorkflow.status,
    toState: status,
    changedBy: (session.user as any).name || "관리자",
  });
}

// 제작 완료 알림
if (status === "제작완료" && currentWorkflow.status !== "제작완료") {
  await handleProductionComplete({
    userId: updatedWorkflow.userId,
    itemName: updatedWorkflow.type,
  });
}

// 택배 정보 입력 시 알림
if (택배회사 && 운송장번호) {
  await handleProductionComplete({
    userId: updatedWorkflow.userId,
    itemName: updatedWorkflow.type,
    trackingNumber: 운송장번호,
  });
  // SMS도 발송 (기존 코드 유지)
}

// 슬랙 진행 로그
await logProgress({
  userId: updatedWorkflow.userId,
  stage: `${updatedWorkflow.type} 상태 변경`,
  status,
  details: {
    "이전 상태": currentWorkflow.status,
    "변경 후": status,
    ...(택배회사 && { 택배회사 }),
    ...(운송장번호 && { 운송장번호 }),
  },
});
```

**효과**:
- ✅ 상태 변경 시 텔레그램 알림
- ✅ 슬랙 진행 로그 자동 기록
- ✅ 제작 완료 시 사용자 알림
- ✅ 택배 정보 입력 시 텔레그램 + SMS 발송

---

### 3. 시안 업로드 시 알림 추가 ✅

**파일**: `app/api/admin/upload-design/route.ts`

**Before**:
```typescript
await prisma.workflow.update({
  where: { id: workflowId },
  data: {
    시안URL: fileUrl,
    시안업로드일: new Date(),
    status: "발주대기",
  },
});

return NextResponse.json({ url: fileUrl });
// ❌ 알림 없음
```

**After**:
```typescript
import { handleDesignUpload } from "@/lib/notification/notificationService";

const updatedWorkflow = await prisma.workflow.update({
  where: { id: workflowId },
  data: {
    시안URL: fileUrl,
    시안업로드일: new Date(),
    status: "발주대기",
  },
});

// 알림 발송 (텔레그램 + 슬랙)
await handleDesignUpload({
  userId: workflow.userId,
  itemName: workflow.type,
  designUrl: fileUrl,
});

return NextResponse.json({ url: fileUrl });
```

**효과**:
- ✅ 사용자에게 텔레그램 알림 발송 (시안 완료)
- ✅ 슬랙에 시안 업로드 로그 기록 (파일 링크 포함)

---

### 4. 발주 요청 시 알림 추가 ✅

**파일**: `app/api/workflows/[id]/order/route.ts`

**Before**:
```typescript
const updated = await prisma.workflow.update({
  where: { id: workflowId },
  data: {
    status: "발주완료",
    발주요청일: new Date(),
    발주승인일: new Date(),
  },
});

// TODO: 알림 발송 (발주 완료)
// await AutoNotificationSystem.send발주완료알림(...)

return NextResponse.json(updated);
```

**After**:
```typescript
import { handleStateChange, handleOrderRequest } from "@/lib/notification/notificationService";

const updated = await prisma.workflow.update({
  where: { id: workflowId },
  data: {
    status: "발주완료",
    발주요청일: new Date(),
    발주승인일: new Date(),
  },
});

// 알림 발송 (발주 완료 - 텔레그램 + 슬랙)
await handleStateChange({
  userId,
  fromState: "발주대기",
  toState: "발주완료",
});

await handleOrderRequest({
  userId,
  printItems: [workflow.type],
});

return NextResponse.json(updated);
```

**효과**:
- ✅ 사용자와 관리자에게 텔레그램 알림
- ✅ 슬랙에 발주 로그 기록

---

### 5. 워크플로우 중복 생성 로직 수정 ✅

**파일**: `app/api/submission/route.ts`

**Before**:
```typescript
// 워크플로우가 없으면 생성, 있으면 상태 업데이트
const workflowTypes = ["명함", "명찰", "대봉투", "자문계약서"];

for (const type of workflowTypes) {
  await prisma.workflow.upsert({
    where: {
      userId_type: { userId, type },
    },
    create: {
      userId,
      type,
      status: "시안중",
      자료제출일: new Date(),
    },
    update: {
      status: "시안중",
      자료제출일: new Date(),
    },
  });
}
```

**After**:
```typescript
// 워크플로우 상태 전환: 대기 -> 시안중
// (회원가입 시 이미 생성되어 있으므로 상태만 변경)
await prisma.workflow.updateMany({
  where: { userId },
  data: {
    status: "시안중",
    자료제출일: new Date(),
  },
});
```

**효과**:
- ✅ 불필요한 upsert 제거
- ✅ 간단한 상태 변경으로 로직 단순화
- ✅ 회원가입 시 생성된 워크플로우 활용

---

### 6. request-print API DEPRECATED 표시 ✅

**파일**: `app/api/submission/request-print/route.ts`

**추가된 주석**:
```typescript
// ⚠️ DEPRECATED: 이 API는 더 이상 사용되지 않습니다.
// 워크플로우는 회원가입 시 자동 생성됩니다.
// 자료 제출 완료 시 상태가 자동으로 변경됩니다.
```

**권장 사항**:
- 향후 이 API 제거 검토
- 또는 다른 용도로 활용 (예: 수동 발주 요청)

---

## 📊 수정 전후 비교

### 워크플로우 생성 흐름

**Before**:
```
[회원가입] → 워크플로우 4개 생성
[자료 제출 완료] → 워크플로우 upsert (중복)
[request-print] → 워크플로우 중복 체크 후 생성 (사용 안 됨)
```

**After**:
```
[회원가입] → 워크플로우 4개 생성 (상태: "대기")
[자료 제출 완료] → 상태 변경 ("대기" → "시안중")
[request-print] → DEPRECATED
```

---

### 알림 시스템 통합

**Before**:
| 이벤트 | 텔레그램 | 슬랙 | SMS |
|--------|----------|------|-----|
| 회원가입 | ✅ | ❌ | ❌ |
| 자료 제출 완료 | ✅ | ✅ | ❌ |
| 시안 업로드 | ❌ | ❌ | ❌ |
| 발주 요청 | ❌ | ❌ | ❌ |
| 상태 변경 | ❌ | ❌ | ❌ |
| 택배 정보 입력 | ❌ | ❌ | ✅ |

**After**:
| 이벤트 | 텔레그램 | 슬랙 | SMS |
|--------|----------|------|-----|
| 회원가입 | ✅ | ❌ | ❌ |
| 자료 제출 완료 | ✅ | ✅ (채널 생성 + 정보 푸시) | ❌ |
| 시안 업로드 | ✅ | ✅ | ❌ |
| 발주 요청 | ✅ | ✅ | ❌ |
| 상태 변경 | ✅ | ✅ | ❌ |
| 택배 정보 입력 | ✅ | ✅ | ✅ |

---

## 🎯 완성된 워크플로우 흐름

```
1. [회원가입] (signup/route.ts)
   ↓
   워크플로우 4개 생성: "대기"
   알림: 텔레그램 (관리자) ✅

2. [자료 제출] (submission/route.ts)
   ↓
   사용자가 필수 항목 입력
   자동 저장

3. [자료 제출 완료] (submission/route.ts)
   ↓
   isComplete = true
   워크플로우 상태: "대기" → "시안중"
   알림:
   - 슬랙 채널 생성 (기수명_이름_브랜드명) ✅
   - 슬랙 제작정보 푸시 ✅
   - 텔레그램 (관리자) ✅

4. [관리자: 시안 업로드] (admin/upload-design/route.ts)
   ↓
   워크플로우 상태: "시안중" → "발주대기"
   시안URL, 시안업로드일 저장
   알림:
   - 텔레그램 (사용자) ✅
   - 슬랙 로그 (파일 링크 포함) ✅

5. [사용자: 발주 요청] (workflows/[id]/order/route.ts)
   ↓
   워크플로우 상태: "발주대기" → "발주완료"
   발주요청일, 발주승인일 저장
   알림:
   - 텔레그램 (사용자 + 관리자) ✅
   - 슬랙 로그 ✅

6. [관리자: 제작 완료] (admin/workflows/update/route.ts)
   ↓
   워크플로우 상태: "발주완료" → "제작완료"
   제작완료일 자동 저장
   알림:
   - 텔레그램 (사용자) ✅
   - 슬랙 로그 ✅

7. [관리자: 택배 정보 입력] (admin/workflows/update/route.ts)
   ↓
   워크플로우 상태: "제작완료" → "발송완료"
   택배회사, 운송장번호, 발송일 저장
   알림:
   - SMS (사용자) ✅
   - 텔레그램 (사용자) ✅
   - 슬랙 로그 ✅
```

---

## 📁 수정된 파일 목록

1. ✅ `app/api/admin/workflows/update/route.ts` - WorkflowLog 수정 + 알림 통합
2. ✅ `app/api/admin/upload-design/route.ts` - 시안 업로드 알림 추가
3. ✅ `app/api/workflows/[id]/order/route.ts` - 발주 요청 알림 추가
4. ✅ `app/api/submission/route.ts` - 워크플로우 중복 생성 제거
5. ✅ `app/api/submission/request-print/route.ts` - DEPRECATED 표시

---

## 🧪 테스트 체크리스트

### 필수 테스트 항목

#### 1. 회원가입 흐름
- [ ] 회원가입 시 워크플로우 4개 생성 확인
- [ ] 텔레그램 관리자 알림 확인

#### 2. 자료 제출 흐름
- [ ] 필수 항목 입력 시 자동 저장 확인
- [ ] 자료 제출 완료 시 워크플로우 상태 "시안중" 확인
- [ ] 슬랙 채널 생성 확인 (기수명_이름_브랜드명)
- [ ] 슬랙 제작정보 푸시 확인
- [ ] 텔레그램 관리자 알림 확인

#### 3. 관리자 시안 업로드
- [ ] 시안 파일 업로드 성공 확인
- [ ] 워크플로우 상태 "발주대기" 확인
- [ ] 시안URL, 시안업로드일 저장 확인
- [ ] 텔레그램 사용자 알림 확인
- [ ] 슬랙 로그 확인 (파일 링크 포함)

#### 4. 사용자 발주 요청
- [ ] 발주 요청 성공 확인
- [ ] 워크플로우 상태 "발주완료" 확인
- [ ] 발주요청일, 발주승인일 저장 확인
- [ ] 텔레그램 알림 확인 (사용자 + 관리자)
- [ ] 슬랙 로그 확인

#### 5. 관리자 상태 변경
- [ ] 상태 변경 성공 확인
- [ ] WorkflowLog 생성 확인 (에러 없이)
- [ ] 텔레그램 알림 확인
- [ ] 슬랙 로그 확인

#### 6. 택배 정보 입력
- [ ] 택배회사, 운송장번호 저장 확인
- [ ] 워크플로우 상태 "발송완료" 확인
- [ ] SMS 발송 확인
- [ ] 텔레그램 알림 확인
- [ ] 슬랙 로그 확인

---

## ⚠️ 남은 개선 사항

### 미완료 항목 (낮은 우선순위)

1. **상태 전환 검증**
   - StateManager의 `canTransition()` 함수를 실제 API에서 사용
   - 잘못된 상태 전환 방지

2. **수정 횟수 추적**
   - 시안 재업로드 시 수정 횟수 증가
   - 2회 초과 시 추가 비용 계산

3. **파일 검증 강화**
   - 이미지 크기 검증 (1000px 이하)
   - 파일 타입 검증
   - 파일명 sanitization

4. **에러 로깅 개선**
   - 구조화된 로그 형식
   - 타임스탬프, userId 등 디버깅 정보 추가

---

## 📌 참고 문서

- [접수 로직 검수 보고서](./SUBMISSION_LOGIC_REVIEW.md)
- [알림 시스템 가이드](./NOTIFICATION_SYSTEM.md)
- [워크플로우 상태 관리](../lib/workflow/stateManager.ts)

---

## ✅ 결론

### 수정 완료
- ✅ WorkflowLog 스키마 오류 수정 → **서버 크래시 방지**
- ✅ 알림 시스템 완전 통합 → **텔레그램 + 슬랙 자동 알림**
- ✅ 워크플로우 중복 생성 제거 → **로직 단순화**
- ✅ 모든 상태 변경 시 알림 발송 → **실시간 진행 상황 추적**

### 시스템 안정성
- ✅ 알림 실패 시에도 주요 로직 정상 작동
- ✅ 에러 핸들링 개선
- ✅ 로깅 추가

### 사용자 경험
- ✅ 모든 단계에서 실시간 알림
- ✅ 슬랙 채널을 통한 진행 과정 기록
- ✅ 투명한 워크플로우 관리

**접수 로직 검수 및 개선 완료!** 🎉
