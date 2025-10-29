# 시안 확인 & 임시저장 기능 사용 가이드

## 📋 목차

1. [기능 개요](#기능-개요)
2. [시안 확인 자동 모달](#시안-확인-자동-모달)
3. [임시저장 vs 최종저장](#임시저장-vs-최종저장)
4. [필수 정보 경고 배너](#필수-정보-경고-배너)
5. [API 엔드포인트](#api-엔드포인트)
6. [컴포넌트 사용법](#컴포넌트-사용법)
7. [데이터베이스 스키마](#데이터베이스-스키마)
8. [FAQ](#faq)

---

## 기능 개요

### 1️⃣ 시안 확인 자동 모달

**목적**: 사용자가 로그인할 때 확인하지 않은 시안이 있으면 자동으로 알림

**주요 기능**:
- 로그인 시 자동 표시
- 24시간 숨김 기능
- 순차적 시안 표시 (하나씩)
- 즉시 이동 버튼

### 2️⃣ 임시저장 & 최종저장

**목적**: 사용자가 필수 정보 입력 전에도 진행 상황을 저장할 수 있도록 지원

**주요 기능**:
- 임시저장: 언제든지 저장 가능 (검증 없음)
- 최종저장: 필수 필드 검증 후 저장
- 실시간 완료율 표시
- 누락 필드 안내

---

## 시안 확인 자동 모달

### 사용자 흐름

```
로그인
  ↓
대시보드 로드
  ↓
컨펌 대기 시안 확인
  ↓
시안 있음? → 모달 표시
시안 없음? → 모달 표시 안 함
```

### 모달 상태

| 상태 | 조건 | 표시 여부 |
|-----|------|----------|
| 표시 | 컨펌 대기 시안 존재 | ✅ |
| 숨김 | 24시간 내 숨김 처리됨 | ❌ |
| 표시 안 함 | 모든 시안 확인 완료 | ❌ |

### 사용 예시

#### 1. 기본 사용 (자동 모드)

```tsx
// app/dashboard/layout.tsx
import { DesignConfirmationModal } from "@/components/ui/design-confirmation-modal";

export default function UserLayout({ children }) {
  return (
    <div>
      {/* 로그인 시 자동으로 작동 */}
      <DesignConfirmationModal />

      {children}
    </div>
  );
}
```

#### 2. 수동 제어 (controlled 모드)

```tsx
"use client";

import { useState } from "react";
import { DesignConfirmationModal } from "@/components/ui/design-confirmation-modal";

export default function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        시안 확인하기
      </button>

      <DesignConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
```

---

## 임시저장 vs 최종저장

### 비교표

| 구분 | 임시저장 | 최종저장 |
|-----|---------|---------|
| 검증 | ❌ 없음 | ✅ 필수 필드 검증 |
| 저장 가능 여부 | 항상 가능 | 필수 정보 입력 시만 |
| 경고 표시 | ⚠️ 경고 배너 표시 | ✅ 경고 없음 |
| isDraft | `true` | `false` |
| 사용자 경험 | 부담 없이 저장 | 완료된 느낌 |

### 워크플로우 상태 흐름

```
신규 생성 (isDraft=true)
  ↓
임시저장 (isDraft=true) ← 여러 번 가능
  ↓
필수 정보 입력 완료
  ↓
최종저장 (isDraft=false)
  ↓
시안 제작 가능
```

### API 호출 예시

#### 임시저장

```typescript
const response = await fetch(`/api/workflows/${workflowId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowData: {
      brandName: "내 브랜드",
      // 일부 필드만 입력됨
    },
    isDraft: true, // 임시저장
  }),
});

// 응답
{
  "success": true,
  "message": "임시저장되었습니다. 필수 정보를 모두 입력 후 최종 저장해주세요.",
  "workflow": {
    "id": "...",
    "isDraft": true,
    "draftSavedAt": "2025-01-26T10:30:00Z"
  }
}
```

#### 최종저장 (필수 정보 미입력 시)

```typescript
const response = await fetch(`/api/workflows/${workflowId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowData: {
      brandName: "내 브랜드",
      // 일부 필드만 입력됨
    },
    isDraft: false, // 최종저장 시도
  }),
});

// 응답 (검증 실패)
{
  "error": "필수 정보를 모두 입력해주세요.",
  "missingFields": [
    "브랜드명 (영문)",
    "사업 분야",
    "브랜드 키워드"
  ],
  "message": "다음 필드를 확인해주세요: 브랜드명 (영문), 사업 분야, 브랜드 키워드"
}
```

#### 최종저장 (성공)

```typescript
const response = await fetch(`/api/workflows/${workflowId}/save`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowData: {
      brandName: "내 브랜드",
      brandNameEng: "My Brand",
      businessField: "IT",
      brandKeywords: "혁신, 기술, 미래",
    },
    isDraft: false, // 최종저장
  }),
});

// 응답
{
  "success": true,
  "message": "저장되었습니다.",
  "workflow": {
    "id": "...",
    "isDraft": false,
    "updatedAt": "2025-01-26T10:35:00Z"
  }
}
```

---

## 필수 정보 경고 배너

### 표시 조건

- ✅ `isDraft === true` (임시저장 상태)
- ❌ `isDraft === false` (최종저장 완료)

### 완료율 계산

```typescript
const completionRate = Math.round(
  ((필수 필드 수 - 누락 필드 수) / 필수 필드 수) * 100
);

// 예시
// 총 4개 필드, 2개 입력 완료
// completionRate = Math.round((4 - 2) / 4 * 100) = 50%
```

### 사용 예시

```tsx
"use client";

import { RequiredFieldsWarning } from "@/components/ui/required-fields-warning";

export default function WorkflowEditPage({ workflowId, isDraft }) {
  return (
    <div>
      {/* 경고 배너 */}
      <RequiredFieldsWarning
        workflowId={workflowId}
        isDraft={isDraft}
        onValidationChange={(result) => {
          console.log("완료율:", result.completionRate);
          console.log("유효성:", result.isValid);
        }}
      />

      {/* 폼 입력 */}
      <form>
        {/* ... */}
      </form>

      {/* 저장 버튼 */}
      <div className="flex gap-2">
        <button onClick={() => save({ isDraft: true })}>
          임시저장
        </button>
        <button onClick={() => save({ isDraft: false })}>
          최종 저장
        </button>
      </div>
    </div>
  );
}
```

---

## API 엔드포인트

### 1. 컨펌 대기 시안 조회

```
GET /api/workflows/pending-confirmation
```

**응답**:
```json
{
  "success": true,
  "workflows": [
    {
      "id": "cuid",
      "type": "로고",
      "designUrl": "https://...",
      "updatedAt": "2025-01-26T10:00:00Z",
      "adminName": "홍길동"
    }
  ],
  "count": 1
}
```

### 2. 모달 24시간 숨김

```
POST /api/workflows/dismiss-modal
```

**요청**:
```json
{
  "workflowId": "cuid"
}
```

**응답**:
```json
{
  "success": true,
  "message": "24시간 동안 모달이 표시되지 않습니다.",
  "expiresAt": "2025-01-27T10:00:00Z"
}
```

### 3. 필수 필드 조회

```
GET /api/workflows/required-fields?workflowType=로고
```

**응답**:
```json
{
  "success": true,
  "workflowType": "로고",
  "requiredFields": [
    {
      "id": "cuid",
      "fieldName": "brandName",
      "fieldLabel": "브랜드명 (한글)",
      "fieldReason": "로고에 표시될 브랜드명",
      "validationType": "notEmpty",
      "minLength": 2,
      "maxLength": 50
    }
  ],
  "count": 4
}
```

### 4. 필수 필드 검증

```
POST /api/workflows/required-fields/validate
```

**요청**:
```json
{
  "workflowId": "cuid"
}
```

**응답 (검증 실패)**:
```json
{
  "success": true,
  "isValid": false,
  "completionRate": 50,
  "totalFields": 4,
  "filledFields": 2,
  "missingFields": [
    {
      "fieldName": "brandNameEng",
      "fieldLabel": "브랜드명 (영문)",
      "fieldReason": "로고 영문 버전 제작 시 필요"
    }
  ]
}
```

**응답 (검증 성공)**:
```json
{
  "success": true,
  "isValid": true,
  "completionRate": 100,
  "totalFields": 4,
  "filledFields": 4,
  "missingFields": []
}
```

### 5. 워크플로우 저장

```
POST /api/workflows/[id]/save
```

**요청**:
```json
{
  "workflowData": {
    "brandName": "내 브랜드",
    "brandNameEng": "My Brand"
  },
  "isDraft": true
}
```

**응답**:
```json
{
  "success": true,
  "message": "임시저장되었습니다.",
  "workflow": {
    "id": "cuid",
    "isDraft": true,
    "draftSavedAt": "2025-01-26T10:30:00Z",
    "updatedAt": "2025-01-26T10:30:00Z"
  }
}
```

---

## 컴포넌트 사용법

### DesignConfirmationModal

**Props**:

| 속성 | 타입 | 기본값 | 설명 |
|-----|------|-------|------|
| isOpen | boolean? | undefined | 모달 표시 여부 (controlled) |
| onClose | () => void? | undefined | 모달 닫기 콜백 |

**사용 예시**:

```tsx
// 자동 모드 (권장)
<DesignConfirmationModal />

// 수동 모드
<DesignConfirmationModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### RequiredFieldsWarning

**Props**:

| 속성 | 타입 | 필수 | 설명 |
|-----|------|-----|------|
| workflowId | string | ✅ | 워크플로우 ID |
| isDraft | boolean | ✅ | 임시저장 상태 여부 |
| onValidationChange | (result) => void | ❌ | 검증 결과 콜백 |

**사용 예시**:

```tsx
<RequiredFieldsWarning
  workflowId="cuid123"
  isDraft={true}
  onValidationChange={(result) => {
    if (result.isValid) {
      console.log("모든 필수 정보 입력 완료!");
    }
  }}
/>
```

---

## 데이터베이스 스키마

### ModalDismissal (모달 숨김 기록)

```prisma
model ModalDismissal {
  id         String   @id @default(cuid())
  userId     String
  workflowId String
  dismissedAt DateTime @default(now())  // 숨김 시각
  expiresAt   DateTime                  // 만료 시각 (dismissedAt + 24h)
  createdAt DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@unique([userId, workflowId])
  @@index([userId, expiresAt])
  @@map("modal_dismissals")
}
```

### RequiredFieldConfig (필수 필드 설정)

```prisma
model RequiredFieldConfig {
  id           String   @id @default(cuid())
  workflowType String   // "로고", "명함", "리플렛" 등
  fieldName    String   // "brandName", "name" 등
  fieldLabel   String   // "브랜드명 (한글)"
  fieldReason  String   // "로고에 표시될 브랜드명"
  fieldOrder   Int      // 표시 순서
  validationType String @default("notEmpty") // "notEmpty", "email", "phone" 등
  minLength    Int?
  maxLength    Int?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([workflowType, fieldName])
  @@index([workflowType, isActive])
  @@map("required_field_configs")
}
```

### Workflow (임시저장 필드 추가)

```prisma
model Workflow {
  // ... 기존 필드

  // 임시저장 관련
  isDraft Boolean @default(true) // true: 임시저장, false: 최종저장
  draftSavedAt DateTime? // 임시저장 시각

  // 관계
  modalDismissals ModalDismissal[]
}
```

---

## FAQ

### Q1. 시안 모달이 계속 표시됩니다. 어떻게 하나요?

**A**: "오늘 하루 보지 않기" 체크박스를 선택하고 "나중에 보기"를 클릭하세요. 24시간 동안 모달이 표시되지 않습니다.

---

### Q2. 임시저장과 최종저장의 차이는 무엇인가요?

**A**:
- **임시저장**: 언제든지 저장 가능, 필수 정보 미입력 시 경고 표시
- **최종저장**: 필수 정보를 모두 입력해야 저장 가능, 경고 없음

---

### Q3. 필수 필드는 어떻게 설정하나요?

**A**: `prisma/seed-required-fields.ts` 파일을 수정하고 다시 실행하세요.

```bash
npx tsx prisma/seed-required-fields.ts
```

---

### Q4. 워크플로우 타입별 필수 필드를 확인하려면?

**A**: 다음 API를 호출하세요.

```bash
curl https://your-domain.com/api/workflows/required-fields?workflowType=로고
```

---

### Q5. 모달 숨김 기간을 24시간이 아닌 다른 기간으로 변경하려면?

**A**: `app/api/workflows/dismiss-modal/route.ts` 파일을 수정하세요.

```typescript
// 24시간 → 48시간으로 변경
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48시간 후
```

---

### Q6. 검증 규칙을 추가하려면?

**A**: `app/api/workflows/required-fields/route.ts` 파일의 POST 핸들러에 검증 로직을 추가하세요.

**예시**: URL 검증 추가

```typescript
// url 검증
if (field.validationType === "url" && typeof value === "string") {
  const urlRegex = /^https?:\/\/.+/;
  if (!urlRegex.test(value)) {
    missingFields.push({
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldReason: "올바른 URL 형식이 아닙니다.",
    });
    continue;
  }
}
```

---

## 💡 개발 팁

### 1. 시안 모달 테스트

```typescript
// 테스트용으로 강제로 시안 상태 변경
await prisma.workflow.update({
  where: { id: "workflow-id" },
  data: {
    status: "design_uploaded",
    designUrl: "https://test.com/design.png",
  },
});
```

### 2. 모달 숨김 기록 확인

```typescript
const dismissals = await prisma.modalDismissal.findMany({
  where: { userId: "user-id" },
  include: { workflow: true },
});
console.log(dismissals);
```

### 3. 필수 필드 완료율 계산

```typescript
const result = await fetch("/api/workflows/required-fields/validate", {
  method: "POST",
  body: JSON.stringify({ workflowId: "..." }),
});

const data = await result.json();
console.log(`완료율: ${data.completionRate}%`);
```

---

## 📚 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com/)

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-01-26
**작성자**: Claude Code
