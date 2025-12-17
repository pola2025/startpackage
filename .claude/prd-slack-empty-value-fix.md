# PRD: 슬랙 메시지 빈 값 필터링 개선

## 문제 정의

슬랙 채널에 기록되는 메시지에서 **변경되지 않았거나 빈 값인 항목**이 반복적으로 표시되어 의미 없는 노이즈가 발생함.

### 현재 문제 예시
```
📝 대봉투 상태 변경
단계: 대봉투 상태 변경
상태: 발송완료
이전 상태: 발주완료
변경 후: 발송완료
택배회사: 롯데택배
운송장번호: 316031841823

✅ 제작 완료
단계: 제작 완료
상태: 대봉투 제작 완료
완료 항목: 대봉투
송장번호: 316031841823    ← 이미 위에서 표시됨 (중복)
```

## 수정 대상 파일 및 함수

### 1. `lib/notification/slackClient.ts`

| 함수 | 문제점 | 해결 방안 |
|------|--------|----------|
| `logProgress` | ✅ 이미 수정됨 | 빈 값 필터링 완료 |
| `logStateChange` | changedBy 없으면 빈 필드 | 빈 값 필터링 |
| `logProductionComplete` | trackingNumber 없으면 빈 필드 | 빈 값 필터링 |
| `logOrder` | expectedDate 없으면 빈 필드 | 빈 값 필터링 |
| `pushSubmissionData` | 제출 데이터 중 빈 값 표시 | 빈 값 필터링 |

### 2. `app/api/admin/workflows/update/route.ts`

| 위치 | 문제점 | 해결 방안 |
|------|--------|----------|
| 315-325라인 | 이전 상태/변경 후가 동일해도 표시 | 실제 변경된 항목만 표시 |

### 3. `app/api/workflows/[id]/approve/route.ts`

| 위치 | 문제점 | 해결 방안 |
|------|--------|----------|
| 105-121라인 | 모든 필드 항상 표시 | 필요한 정보만 간결하게 |

## 구현 상세

### 1. `logStateChange` 수정
```typescript
// Before
const details: Record<string, string> = {
  "이전 상태": fromState,
  "변경 후": toState,
};
if (changedBy) {
  details["변경자"] = changedBy;
}

// After - 빈 값 및 동일 값 필터링
const details: Record<string, string> = {};
if (fromState && fromState.trim()) details["이전 상태"] = fromState;
if (toState && toState.trim()) details["변경 후"] = toState;
if (changedBy && changedBy.trim()) details["변경자"] = changedBy;
```

### 2. `logProductionComplete` 수정
```typescript
// Before
const details: Record<string, string> = {
  "완료 항목": itemName,
};
if (trackingNumber) {
  details["송장번호"] = trackingNumber;
}

// After - trackingNumber 있을 때만 표시
const details: Record<string, string> = {};
if (itemName && itemName.trim()) details["완료 항목"] = itemName;
if (trackingNumber && trackingNumber.trim()) details["송장번호"] = trackingNumber;
```

### 3. `logOrder` 수정
```typescript
// Before
const details: Record<string, string> = {
  "발주 항목": printItems.join(", "),
};
if (expectedDate) {
  details["예상 완료일"] = expectedDate.toLocaleDateString("ko-KR");
}

// After
const details: Record<string, string> = {};
if (printItems.length > 0) details["발주 항목"] = printItems.join(", ");
if (expectedDate) details["예상 완료일"] = expectedDate.toLocaleDateString("ko-KR");
```

### 4. `pushSubmissionData` 수정
```typescript
// After - 값이 있는 필드만 추가
textFields.forEach(({ key, label }) => {
  const value = submissionData[key];
  if (value && value.toString().trim()) {  // 빈 값 필터링 추가
    fields.push({
      type: "mrkdwn",
      text: `*${label}:*\n${value}`,
    });
  }
});
```

### 5. 워크플로우 상태 변경 로그 개선 (`update/route.ts`)
```typescript
// Before
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

// After - 실제 변경된 항목만
const changedDetails: Record<string, string> = {};
if (currentWorkflow.status !== status) {
  changedDetails["이전 상태"] = currentWorkflow.status;
  changedDetails["변경 후"] = status;
}
if (택배회사 && 택배회사 !== currentWorkflow.택배회사) {
  changedDetails["택배회사"] = 택배회사;
}
if (운송장번호 && 운송장번호 !== currentWorkflow.운송장번호) {
  changedDetails["운송장번호"] = 운송장번호;
}

// 변경된 내용이 있을 때만 로그
if (Object.keys(changedDetails).length > 0) {
  await logProgress({
    userId: updatedWorkflow.userId,
    stage: `${updatedWorkflow.type} 상태 변경`,
    status,
    details: changedDetails,
  });
}
```

## 체크리스트

- [x] `slackClient.ts` - `logProgress` 빈 값 필터링 ✅
- [x] `slackClient.ts` - `logStateChange` 빈 값 필터링 ✅
- [x] `slackClient.ts` - `logProductionComplete` 빈 값 필터링 ✅
- [x] `slackClient.ts` - `logOrder` 빈 값 필터링 ✅
- [x] `slackClient.ts` - `pushSubmissionData` 빈 값 필터링 ✅
- [x] `update/route.ts` - 실제 변경된 항목만 로그 ✅
- [ ] 테스트: 상태 변경 시 슬랙 메시지 확인

## 예상 결과

### Before
```
📝 대봉투 상태 변경
단계: 대봉투 상태 변경
상태: 발송완료
이전 상태: 발주완료
변경 후: 발송완료
택배회사:
운송장번호:
```

### After
```
📝 대봉투 상태 변경
상태: 발송완료
이전 상태: 발주완료 → 발송완료
```

---
*작성일: 2024-12-17*
