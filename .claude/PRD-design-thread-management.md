# PRD: 시안관리 쓰레드 시스템

## 1. 개요

### 1.1 목적
기존 워크플로우(명함, 명찰, 대봉투 등)의 **시안 확인 과정을 별도 시안관리 페이지로 분리**하여, 관리자와 클라이언트가 시안별로 체계적인 피드백을 주고받을 수 있도록 한다.

### 1.2 핵심 컨셉

```
┌─────────────────────────────────────────────────────────────────┐
│                        워크플로우 흐름                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [대기] → [시안중] → ┌──────────────────┐ → [발주요청] → [완료] │
│                      │                  │                       │
│                      │  시안관리 페이지  │                       │
│                      │  (별도 분리)     │                       │
│                      │                  │                       │
│                      │  시안 업로드     │                       │
│                      │      ↓          │                       │
│                      │  피드백/수정요청  │                       │
│                      │      ↓          │                       │
│                      │  시안 재업로드   │                       │
│                      │      ↓          │                       │
│                      │  최종 확정 ──────┼───→ 워크플로우 완료   │
│                      │                  │                       │
│                      └──────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**핵심**:
- 워크플로우에서 "시안중" 단계가 되면 → **시안관리 페이지로 이동**
- 시안관리에서 모든 피드백/수정 과정 진행
- **최종 확정 시에만** 워크플로우로 결과값 전달 (완료 처리)

### 1.3 배경
- **현재 문제점**:
  - `Workflow.feedback` 단일 필드로 피드백 관리 → 이력 추적 불가
  - 시안 버전별 피드백 흐름 파악 어려움
  - 수정 요청사항이 덮어쓰기됨
  - 워크플로우 페이지에서 시안 확인 과정이 복잡함

- **개선 방향**:
  - 시안 확인 과정을 **별도 페이지로 분리** (관심사 분리)
  - 시안 버전별 쓰레드 형태의 피드백 시스템
  - 관리자/클라이언트 양방향 커뮤니케이션
  - 시안 최종 확정 시 워크플로우 자동 완료 처리

### 1.4 범위
- 시안관리 전용 페이지 (관리자 + 클라이언트 공용)
- 시안 쓰레드 모델 추가
- 기존 워크플로우 연동 (최종 확정값만 전달)

---

## 2. 사용자 스토리

### 2.1 관리자
```
AS 관리자
I WANT 클라이언트별/디자인별 시안 쓰레드를 관리할 수 있기를
SO THAT 시안 수정 요청과 피드백을 체계적으로 추적할 수 있다
```

### 2.2 클라이언트
```
AS 클라이언트
I WANT 내 디자인의 시안 진행 상황을 한눈에 볼 수 있기를
SO THAT 시안 확인 및 피드백을 쉽게 할 수 있다
```

---

## 3. 기능 요구사항

### 3.1 시안관리 페이지

#### 3.1.1 관리자 페이지 (`/admin/design-threads`)
| 기능 | 설명 |
|------|------|
| 클라이언트 목록 | 시안 진행 중인 클라이언트 목록 표시 |
| 워크플로우 필터 | 명함, 명찰, 대봉투 등 타입별 필터링 |
| 상태 필터 | 진행중, 피드백대기, 확정완료 필터링 |
| 시안 업로드 | 새 시안 버전 업로드 + 메시지 작성 |
| 피드백 확인 | 클라이언트 피드백 읽음 처리 |

#### 3.1.2 클라이언트 페이지 (`/dashboard/design-threads`)
| 기능 | 설명 |
|------|------|
| 내 시안 목록 | 진행 중인 디자인별 시안 목록 |
| 시안 확인 | 각 버전별 시안 파일 다운로드/미리보기 |
| 피드백 작성 | 수정 요청사항 작성 (텍스트 + 이미지 첨부) |
| 최종 확정 | 시안 승인 → 워크플로우 상태 변경 |

### 3.2 시안 쓰레드 기능

#### 3.2.1 쓰레드 생성
- 워크플로우당 1개의 시안 쓰레드 자동 생성
- 첫 시안 업로드 시 쓰레드 활성화

#### 3.2.2 메시지 유형
| 유형 | 작성자 | 내용 |
|------|--------|------|
| 시안 업로드 | 관리자 | 시안 파일 + 설명 |
| 수정 요청 | 클라이언트 | 피드백 내용 + 첨부파일 |
| 일반 메시지 | 양쪽 | 질문/답변 |
| 최종 확정 | 클라이언트 | 시안 승인 (시스템 메시지) |

#### 3.2.3 상태 흐름
```
[시안 업로드됨] → 관리자가 시안 업로드
       ↓
[피드백 대기] → 클라이언트 확인 대기
       ↓
   ┌───┴───┐
   ↓       ↓
[수정 요청]  [확정 완료]
   ↓           ↓
[시안 업로드됨] → Workflow 상태 변경
  (반복)       (발주대기 → 발주요청)
```

### 3.3 워크플로우 연동

#### 3.3.1 시안 확정 시 자동 처리
```typescript
// 시안 최종 확정 시
workflow.status = "발주요청"  // 또는 다음 단계
workflow.시안업로드일 = now() // 최종 시안일
workflow.수정횟수 = thread.revisionCount
```

#### 3.3.2 기존 필드 활용
- `Workflow.시안URL` → 최종 확정된 시안 URL
- `Workflow.시안이력` → 버전별 시안 목록 (JSON)
- `Workflow.수정횟수` → 쓰레드에서 자동 집계
- `DesignHistory` → 시안 버전 이력 (기존 모델 활용)

---

## 4. 데이터 모델

### 4.1 신규 모델: DesignThread

```prisma
model DesignThread {
  id         String   @id @default(cuid())
  workflowId String   @unique
  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  // 상태
  status     String   @default("pending") // "pending" | "uploaded" | "feedback_waiting" | "revision_requested" | "confirmed"

  // 현재 시안 버전
  currentVersion Int @default(0)

  // 최종 확정
  confirmedAt    DateTime?
  confirmedByName String?

  // 메시지 관계
  messages DesignThreadMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@map("design_threads")
}
```

### 4.2 신규 모델: DesignThreadMessage

```prisma
model DesignThreadMessage {
  id       String       @id @default(cuid())
  threadId String
  thread   DesignThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  // 작성자
  authorId   String
  authorType String  // "admin" | "user"
  authorName String

  // 메시지 유형
  messageType String // "design_upload" | "revision_request" | "message" | "confirmation"

  // 내용
  content     String   @db.Text
  attachments String[] // 첨부파일 URL 배열

  // 시안 업로드인 경우
  designVersion Int?     // 시안 버전 (1차, 2차...)
  designUrl     String?  // 시안 파일 URL

  // 읽음 상태
  isReadByAdmin Boolean @default(false)
  isReadByUser  Boolean @default(false)

  createdAt DateTime @default(now())

  @@index([threadId])
  @@index([createdAt])
  @@map("design_thread_messages")
}
```

### 4.3 Workflow 모델 수정

```prisma
model Workflow {
  // ... 기존 필드 ...

  // 시안 쓰레드 관계 추가
  designThread DesignThread?
}
```

---

## 5. API 설계

### 5.1 시안 쓰레드 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/design-threads` | 쓰레드 목록 (필터링) |
| GET | `/api/design-threads/[id]` | 쓰레드 상세 + 메시지 |
| POST | `/api/design-threads/[id]/messages` | 메시지 추가 |
| POST | `/api/design-threads/[id]/confirm` | 시안 최종 확정 |
| PATCH | `/api/design-threads/[id]/read` | 읽음 처리 |

### 5.2 요청/응답 예시

#### GET `/api/design-threads`
```json
// 관리자: 모든 클라이언트 쓰레드
// 클라이언트: 본인 쓰레드만

{
  "threads": [
    {
      "id": "cuid",
      "workflow": {
        "id": "cuid",
        "type": "명함",
        "user": { "이름": "홍길동", "브랜드명": "테스트브랜드" }
      },
      "status": "feedback_waiting",
      "currentVersion": 2,
      "lastMessage": {
        "content": "2차 시안 확인해주세요",
        "createdAt": "2025-01-26T10:00:00Z"
      },
      "unreadCount": 1
    }
  ]
}
```

#### POST `/api/design-threads/[id]/messages`
```json
// 관리자: 시안 업로드
{
  "messageType": "design_upload",
  "content": "1차 시안입니다. 확인 부탁드립니다.",
  "designUrl": "https://...",
  "designVersion": 1
}

// 클라이언트: 수정 요청
{
  "messageType": "revision_request",
  "content": "로고 색상을 파란색으로 변경해주세요",
  "attachments": ["https://...참고이미지.png"]
}
```

#### POST `/api/design-threads/[id]/confirm`
```json
// 클라이언트: 시안 확정
{
  "confirmedVersion": 2,
  "message": "2차 시안으로 확정합니다"
}

// 응답: 워크플로우 상태 자동 변경
{
  "success": true,
  "thread": { "status": "confirmed", "confirmedAt": "..." },
  "workflow": { "status": "발주요청" }
}
```

---

## 6. UI/UX 설계

### 6.1 페이지 구조

```
/admin/design-threads
├── 클라이언트 필터 (검색)
├── 워크플로우 타입 필터 (명함, 명찰, 대봉투)
├── 상태 필터 (전체, 피드백대기, 수정요청, 확정완료)
└── 쓰레드 리스트
    └── 클릭 → 사이드 패널 또는 상세 페이지

/dashboard/design-threads
├── 내 시안 목록
└── 쓰레드 상세 (메시지 목록 + 입력창)
```

### 6.2 쓰레드 상세 UI

```
┌─────────────────────────────────────────────────┐
│ 명함 시안 - 홍길동 (테스트브랜드)               │
│ 상태: 피드백 대기 중                            │
├─────────────────────────────────────────────────┤
│                                                 │
│ [관리자] 2025-01-25 10:00                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📎 1차 시안                                 │ │
│ │ 1차 시안입니다. 확인 부탁드립니다.          │ │
│ │ [시안 다운로드]                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                   [클라이언트] 2025-01-25 14:00 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 로고 색상을 파란색으로 변경해주세요.        │ │
│ │ [첨부: 참고이미지.png]                      │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [관리자] 2025-01-26 10:00                       │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📎 2차 시안                                 │ │
│ │ 수정 반영했습니다. 확인 부탁드립니다.       │ │
│ │ [시안 다운로드]                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│ [메시지 입력...]                    [📎] [전송] │
│                                                 │
│ [시안 확정하기] (클라이언트만 표시)             │
└─────────────────────────────────────────────────┘
```

### 6.3 상태별 배지 색상

| 상태 | 배지 | 색상 |
|------|------|------|
| pending | 대기 | gray |
| uploaded | 시안 업로드됨 | blue |
| feedback_waiting | 피드백 대기 | yellow |
| revision_requested | 수정 요청 | orange |
| confirmed | 확정 완료 | green |

---

## 7. 워크플로우 연동 상세

### 7.1 핵심 원칙

```
워크플로우                    시안관리
┌─────────┐                 ┌─────────────────────┐
│         │                 │                     │
│  시안중  │ ──── 진입 ────→ │  시안 쓰레드 생성    │
│         │                 │       ↓            │
│         │                 │  시안 업로드        │
│         │                 │       ↓            │
│         │                 │  피드백 (반복)      │
│         │                 │       ↓            │
│ 발주요청 │ ←─ 최종확정 ─── │  클라이언트 확정    │
│         │                 │                     │
└─────────┘                 └─────────────────────┘

✅ 워크플로우는 "시안중" 상태에서 대기
✅ 시안관리에서 모든 과정 진행
✅ 최종 확정 시에만 워크플로우 상태 변경 (발주요청)
```

### 7.2 상태 매핑

| 시안 쓰레드 상태 | 워크플로우 상태 | 설명 |
|------------------|-----------------|------|
| pending | 시안중 | 쓰레드 생성됨, 시안 대기 |
| in_progress | 시안중 | 시안 업로드/피드백 진행 중 |
| feedback_waiting | 시안중 | 클라이언트 피드백 대기 |
| revision_requested | 시안중 | 수정 요청됨 |
| **confirmed** | **발주요청** | ✅ 최종 확정 → 워크플로우 완료 |

### 7.3 워크플로우 진입점

**관리자**: 워크플로우를 "시안중"으로 변경 시
```typescript
// 워크플로우 상태 변경
await prisma.workflow.update({
  where: { id: workflowId },
  data: { status: "시안중" }
});

// 시안 쓰레드 자동 생성
await prisma.designThread.create({
  data: {
    workflowId,
    status: "pending"
  }
});
```

**클라이언트**: 워크플로우 목록에서 "시안중" 항목 클릭 시
→ 시안관리 페이지로 이동 (`/dashboard/design-threads/[threadId]`)

### 7.4 확정 시 자동 처리 로직

```typescript
async function confirmDesign(threadId: string, userId: string) {
  const thread = await prisma.designThread.findUnique({
    where: { id: threadId },
    include: {
      workflow: true,
      messages: {
        where: { messageType: "design_upload" },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  const latestDesign = thread.messages[0];

  // 1. 쓰레드 확정 처리
  await prisma.designThread.update({
    where: { id: threadId },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedByName: user.이름
    }
  });

  // 2. 워크플로우 완료 처리 (최종 확정값만 전달)
  await prisma.workflow.update({
    where: { id: thread.workflowId },
    data: {
      status: "발주요청",           // 다음 단계로 진행
      시안URL: latestDesign.designUrl,  // 최종 확정 시안
      시안업로드일: new Date(),
      수정횟수: thread.currentVersion - 1  // 수정 횟수
    }
  });

  // 3. 워크플로우 로그 기록
  await prisma.workflowLog.create({
    data: {
      workflowId: thread.workflowId,
      action: "시안확정",
      performedBy: userId,
      performedByName: user.이름,
      previousStatus: "시안중",
      newStatus: "발주요청",
      metadata: {
        confirmedVersion: thread.currentVersion,
        designUrl: latestDesign.designUrl
      }
    }
  });

  // 4. 알림 발송
  // - 관리자에게 "시안 확정됨" 알림
}
```

---

## 8. 마이그레이션 계획

### 8.1 Phase 1: 스키마 추가 (비파괴적)
1. `DesignThread` 모델 추가
2. `DesignThreadMessage` 모델 추가
3. `Workflow.designThread` 관계 추가
4. `prisma migrate dev` 실행

### 8.2 Phase 2: 기존 데이터 마이그레이션 (선택)
- 기존 `Workflow.feedback` 데이터를 쓰레드 메시지로 변환
- 기존 `DesignHistory` 데이터를 쓰레드 메시지로 변환

### 8.3 Phase 3: UI 구현
1. `/admin/design-threads` 페이지
2. `/dashboard/design-threads` 페이지
3. API 엔드포인트 구현

### 8.4 Phase 4: 기존 시스템 연동
1. 워크플로우 상태 자동 변경 로직
2. 알림 시스템 연동

---

## 9. 테스트 시나리오

### 9.1 관리자 시나리오
1. 클라이언트 시안 목록 조회
2. 시안 업로드 + 메시지 작성
3. 클라이언트 피드백 확인 (읽음 처리)
4. 수정 시안 업로드

### 9.2 클라이언트 시나리오
1. 내 시안 목록 조회
2. 시안 다운로드/미리보기
3. 수정 요청 작성 (첨부파일 포함)
4. 시안 최종 확정

### 9.3 자동화 시나리오
1. 시안 확정 → 워크플로우 상태 자동 변경
2. 워크플로우 로그 자동 기록

---

## 10. 기술 스택

- **Frontend**: Next.js 15, React 19, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **File Upload**: UploadThing (기존 사용 중)
- **Real-time**: SSE (Server-Sent Events) - 선택사항

---

## 11. 일정 (예상)

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | PRD 검토 및 승인 | - |
| 2 | 스키마 설계 및 마이그레이션 | - |
| 3 | API 엔드포인트 구현 | - |
| 4 | 관리자 UI 구현 | - |
| 5 | 클라이언트 UI 구현 | - |
| 6 | 워크플로우 연동 | - |
| 7 | 테스트 및 QA | - |
| 8 | 프로덕션 배포 | - |

---

## 12. 질문 및 확인 필요 사항

### 12.1 확정 필요
- [x] 시안 확정 시 워크플로우 상태: `시안중` → `발주요청`으로 변경 ✅
- [x] 파일 업로드: 이미지 (관리자/클라이언트) + AI 파일 (최종확정 시) ✅
- [x] 최종 AI 파일 저장: Google Drive 연동 ✅
- [ ] 실시간 알림 필요 여부 (SSE/WebSocket)?

### 12.2 선택 사항
- [ ] 기존 `Workflow.feedback` 데이터 마이그레이션 여부
- [ ] 이메일/SMS 알림 연동 범위

---

## 13. 기존 워크플로우 UI 변경

### 13.1 워크플로우 목록에서 변경

**관리자 (`/admin/workflows`)**:
- "시안중" 상태 워크플로우 → "시안관리" 버튼 추가
- 버튼 클릭 → `/admin/design-threads/[threadId]`로 이동

**클라이언트 (`/dashboard/workflows`)**:
- "시안중" 상태 워크플로우 → "시안 확인하기" 버튼 추가
- 버튼 클릭 → `/dashboard/design-threads/[threadId]`로 이동

### 13.2 워크플로우 상세에서 변경

**기존**: 시안 확인 UI가 워크플로우 상세 안에 포함
**변경**: "시안중" 상태일 때 시안관리 페이지 링크만 표시

```tsx
{workflow.status === "시안중" && (
  <Card>
    <CardHeader>
      <CardTitle>시안 확인</CardTitle>
    </CardHeader>
    <CardContent>
      <p>시안 확인은 시안관리 페이지에서 진행됩니다.</p>
      <Button asChild>
        <Link href={`/dashboard/design-threads/${workflow.designThread?.id}`}>
          시안관리 페이지로 이동
        </Link>
      </Button>
    </CardContent>
  </Card>
)}

---

---

## 14. 파일 업로드 및 Google Drive 연동

### 14.1 파일 업로드 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        파일 업로드 흐름                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [시안 진행 중]                                                 │
│  ├─ 관리자: 시안 이미지 업로드 (JPG, PNG, PDF)                  │
│  │         → UploadThing (기존 사용)                            │
│  │                                                              │
│  └─ 클라이언트: 참고 이미지 첨부 (JPG, PNG)                     │
│                → UploadThing (기존 사용)                        │
│                                                                 │
│  [최종 확정 시]                                                 │
│  └─ 관리자: AI 원본 파일 업로드                                 │
│            → Google Drive (서버 부하 방지)                      │
│            → 클라이언트 다운로드 링크 제공                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 파일 종류별 저장소

| 파일 종류 | 저장소 | 이유 |
|----------|--------|------|
| 시안 이미지 (JPG, PNG, PDF) | UploadThing | 빠른 미리보기, 기존 인프라 |
| 참고 이미지 (피드백 첨부) | UploadThing | 기존 인프라 활용 |
| **AI 원본 파일** | **Google Drive** | 대용량 파일, 서버 부하 방지 |

### 14.3 Google Drive 연동 구조

**Service Account 방식 사용** (서버 to 서버 인증)

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js API   │ ──→  │  Google Drive   │ ──→  │  공유 폴더      │
│   (백엔드)      │      │  API v3         │      │  (클라이언트별) │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                                                  │
        │ 1. AI 파일 업로드                                │
        │ 2. 공유 링크 생성                                │
        │ 3. DB에 링크 저장                                ↓
        │                                         클라이언트 다운로드
        └──────────────────────────────────────────────────┘
```

### 14.4 Google Drive 폴더 구조

```
📁 스타트패키지_시안원본 (루트 폴더)
├── 📁 1기_홍길동_테스트브랜드
│   ├── 📁 명함
│   │   ├── 명함_최종_v2.ai
│   │   └── 명함_최종_v2.pdf
│   ├── 📁 명찰
│   │   └── 명찰_최종.ai
│   └── 📁 대봉투
│       └── 대봉투_최종.ai
├── 📁 1기_김철수_ABC브랜드
│   └── ...
└── ...
```

### 14.5 데이터 모델 추가

```prisma
model DesignThread {
  // ... 기존 필드 ...

  // 최종 확정 파일 (Google Drive)
  finalFileUrl      String?   // Google Drive 공유 링크
  finalFileName     String?   // 파일명 (예: "명함_최종_v2.ai")
  finalFileUploadedAt DateTime?
}
```

### 14.6 API 엔드포인트 추가

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/design-threads/[id]/upload-final` | AI 원본 파일 Google Drive 업로드 |
| GET | `/api/design-threads/[id]/download-final` | Google Drive 다운로드 링크 반환 |

### 14.7 최종 확정 시 처리 로직

```typescript
async function confirmDesignWithFinalFile(
  threadId: string,
  userId: string,
  finalFile: File  // AI 파일
) {
  // 1. Google Drive에 파일 업로드
  const driveService = getDriveService();

  // 클라이언트별 폴더 찾기/생성
  const folderName = `${user.cohort.name}_${user.이름}_${submission.브랜드명}`;
  const folderId = await findOrCreateFolder(driveService, folderName);

  // 파일 업로드
  const uploadedFile = await driveService.files.create({
    resource: {
      name: `${workflow.type}_최종_v${thread.currentVersion}.ai`,
      parents: [folderId]
    },
    media: {
      mimeType: 'application/illustrator',
      body: finalFile.stream()
    },
    fields: 'id, webViewLink, webContentLink'
  });

  // 2. 쓰레드 확정 + 파일 정보 저장
  await prisma.designThread.update({
    where: { id: threadId },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      finalFileUrl: uploadedFile.data.webContentLink,  // 다운로드 링크
      finalFileName: `${workflow.type}_최종_v${thread.currentVersion}.ai`,
      finalFileUploadedAt: new Date()
    }
  });

  // 3. 워크플로우 완료 처리
  await prisma.workflow.update({
    where: { id: thread.workflowId },
    data: {
      status: "발주요청",
      시안URL: latestDesignUrl
    }
  });
}
```

### 14.8 환경 변수

```env
# Google Drive API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1abc...xyz  # 루트 폴더 ID
```

### 14.9 보안 고려사항

1. **Service Account 키 관리**
   - JSON 키 파일 Git 커밋 금지
   - 환경 변수로 관리

2. **파일 접근 권한**
   - 클라이언트별 폴더 분리
   - 다운로드 링크는 해당 사용자만 접근 가능

3. **파일 용량 제한**
   - AI 파일: 최대 100MB 권장

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 0.1 | 2025-12-09 | Claude | 초안 작성 |
| 0.2 | 2025-12-09 | Claude | 핵심 컨셉 명확화: 워크플로우에서 시안관리 분리, 최종 확정값만 전달 |
| 0.3 | 2025-12-09 | Claude | 파일 업로드 및 Google Drive 연동 섹션 추가 |
