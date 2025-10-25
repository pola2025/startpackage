# 관리자 대시보드 상세 기획

## 📋 목차
1. [대시보드 개요](#대시보드-개요)
2. [주요 기능](#주요-기능)
3. [화면 구성](#화면-구성)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 엔드포인트](#api-엔드포인트)

---

## 대시보드 개요

### 목적
- 기수별 사용자 진행 현황 실시간 모니터링
- 워크플로우 제어 (시안 업로드, 발주 승인, 택배 발송)
- 알림 발송 이력 관리
- 사용자 일괄 관리

### 사용자 권한
```typescript
type AdminRole = 'super' | 'designer' | 'operator';

const PERMISSIONS = {
  super: ['*'], // 모든 권한
  designer: [
    'workflow:read',
    'workflow:upload_design',
    'user:read',
  ],
  operator: [
    'user:read',
    'user:write',
    'cohort:read',
    'cohort:write',
    'notification:read',
    'notification:send',
    'workflow:read',
    'workflow:update_shipping',
  ],
};
```

---

## 주요 기능

### 1. 홈 대시보드 (통계)

#### 상단 KPI 카드
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 전체 사용자 │ 자료 제출률 │ 발주 대기   │ 발송 완료   │
│    120명    │    85%      │    15건     │    45건     │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 기수별 진행률
```typescript
interface CohortProgress {
  cohortId: string;
  cohortName: string; // "1기", "2기"
  totalUsers: number;
  submissionComplete: number; // 제출 완료 인원
  submissionRate: number; // 제출률 (%)
  avgCompletionDays: number; // 평균 제출 소요일
  deadlineDays: number; // D-7, D-3 등
}
```

**차트:**
- 기수별 제출률 (Bar Chart)
- 일별 제출 현황 (Line Chart)
- 워크플로우 단계별 분포 (Pie Chart)

---

### 2. 사용자 관리 (`/admin/users`)

#### 테이블 컬럼
```typescript
interface UserTableRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  cohortName: string;

  // 제출 현황
  submissionStatus: '미제출' | '부분제출' | '제출완료';
  submittedAt: Date | null; // 최초 제출일
  completedAt: Date | null; // 완료일

  // 워크플로우 현황
  workflows: {
    명함: WorkflowStatus;
    전단지: WorkflowStatus;
    홈페이지: WorkflowStatus;
  };

  // 알림 수신 동의
  smsConsent: boolean;
  emailConsent: boolean;

  createdAt: Date;
}

type WorkflowStatus =
  | '대기'
  | '시안중'
  | '발주대기'
  | '발주완료'
  | '제작완료'
  | '발송완료';
```

#### 필터 옵션
- 기수 선택
- 제출 상태 (전체/미제출/부분제출/완료)
- 워크플로우 상태
- 검색 (이름, 이메일, 연락처)

#### 액션
- 개별 사용자 상세 보기
- 알림 발송 (선택한 사용자에게 일괄 발송)
- CSV 다운로드
- 사용자 일괄 등록 (CSV 업로드)

---

### 3. 워크플로우 관리 (`/admin/workflows`)

#### 테이블 컬럼
```typescript
interface WorkflowTableRow {
  id: string;
  userName: string;
  userEmail: string;
  cohortName: string;
  type: '명함' | '전단지' | '홈페이지';
  status: WorkflowStatus;

  // 📅 날짜 추적
  createdAt: Date; // 워크플로우 생성일
  자료제출일: Date | null; // 사용자가 자료 제출한 날짜
  시안업로드일: Date | null; // 디자이너가 시안 업로드한 날짜
  발주요청일: Date | null; // 사용자가 발주 요청한 날짜
  발주승인일: Date | null; // 관리자가 발주 승인한 날짜
  예상발주일: Date | null; // 자동 계산 (마감일 기준)
  제작완료일: Date | null;
  발송일: Date | null;

  // 파일
  시안URL: string | null;

  // 택배
  운송장번호: string | null;
  택배회사: string | null;
}
```

#### 필터
- 기수
- 워크플로우 타입 (명함/전단지/홈페이지)
- 상태 (대기/시안중/발주대기/발주완료/제작완료/발송완료)
- 날짜 범위 (발주일, 예상발주일)

#### 액션
- **시안 업로드** (디자이너 권한)
  - PDF 업로드
  - 업로드 시 자동으로 상태 → "발주대기"
  - 사용자에게 "시안완료" 알림 발송

- **발주 승인** (관리자 권한)
  - 사용자가 발주 요청하면 → "발주완료"
  - "발주완료" 알림 발송

- **택배번호 입력** (관리자 권한)
  ```typescript
  interface ShippingInfo {
    workflowId: string;
    택배회사: '우체국' | 'CJ대한통운' | '한진택배' | '로젠택배';
    운송장번호: string;
    발송일: Date;
  }
  ```
  - 입력 시 상태 → "발송완료"
  - "발송완료" 알림 발송

---

### 4. 알림 발송 이력 (`/admin/notifications`)

#### 테이블 컬럼
```typescript
interface NotificationLogRow {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  cohortName: string;

  // 알림 정보
  type: NotificationType;
  channel: 'SMS' | 'EMAIL';
  title: string;
  message: string; // 전문 내용

  // 발송 결과
  status: '전송중' | '성공' | '실패';
  errorMessage: string | null;

  sentAt: Date;
}

type NotificationType =
  | '회원가입완료'
  | '2주차미제출알림'
  | '마감7일전'
  | '마감3일전'
  | '마감1일전'
  | '시안완료'
  | '발주완료'
  | '제작완료'
  | '발송완료'
  | '수동발송'; // 관리자가 수동으로 발송
```

#### 필터
- 기수
- 알림 타입
- 발송 채널 (SMS/EMAIL)
- 발송 상태 (성공/실패)
- 날짜 범위

#### 상세 보기
```
┌────────────────────────────────────────────────┐
│ 알림 상세                                      │
├────────────────────────────────────────────────┤
│ 사용자: 홍길동 (010-1234-5678)                 │
│ 발송 시각: 2025-01-15 09:00:00                 │
│ 채널: SMS                                      │
│ 상태: ✅ 성공                                  │
├────────────────────────────────────────────────┤
│ 📱 발송 내용:                                  │
│                                                │
│ [스타트패키지] 🚨 마감일이 3일 남았습니다!    │
│                                                │
│ 🚨 홍길동님, 마감일이 3일밖에 남지 않았습니다!│
│                                                │
│ 📅 마감일: 2025-01-18 (D-3)                    │
│                                                │
│ ❌ 긴급! 아직 제출되지 않은 자료:              │
│   - 사업자등록증                               │
│   - 프로필사진                                 │
│                                                │
│ 지금 바로 제출해주세요!                        │
└────────────────────────────────────────────────┘
```

#### 액션
- **재발송** (실패 건)
- **CSV 다운로드** (발송 이력)
- **수동 발송**
  - 특정 사용자 선택
  - 템플릿 선택 또는 커스텀 메시지
  - SMS/EMAIL 선택

---

### 5. 기수 관리 (`/admin/cohorts`)

#### 테이블
```typescript
interface CohortRow {
  id: string;
  name: string; // "1기", "2기"
  교육시작일: Date;
  교육요일: '월' | '화' | '수' | '목' | '금';
  자료제출마감일: Date;

  // 통계
  totalUsers: number;
  submissionRate: number; // 제출률
  activeWorkflows: number; // 진행 중인 워크플로우

  createdAt: Date;
}
```

#### 액션
- 기수 추가
- 기수 수정 (날짜 변경)
- 기수 삭제 (사용자 없을 때만)

---

## 화면 구성

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  [로고] 스타트패키지 관리자          [알림] [관리자명] ▼ │
├──────────────────────────────────────────────────────────┤
│          │                                                │
│  ◉ 홈    │                                                │
│  ○ 사용자│             📊 Dashboard Content               │
│  ○ 워크플로우                                             │
│  ○ 알림  │                                                │
│  ○ 기수  │                                                │
│          │                                                │
│  ── 설정 │                                                │
│  ○ 계정  │                                                │
│  ○ 로그아웃                                               │
└──────────────────────────────────────────────────────────┘
```

### 워크플로우 상세 페이지 (`/admin/workflows/[id]`)
```
┌────────────────────────────────────────────────────────┐
│  ← 뒤로가기                                            │
├────────────────────────────────────────────────────────┤
│  명함 제작 - 홍길동 (1기)                             │
│  상태: 🟡 발주대기                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📋 기본 정보                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  사용자: 홍길동 (hong@example.com)                    │
│  연락처: 010-1234-5678                                 │
│  기수: 1기 (마감일: 2025-01-20)                        │
│                                                        │
│  📅 진행 이력                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  ✅ 자료 제출일:   2025-01-10 14:23                   │
│  ✅ 시안 업로드일: 2025-01-12 10:15                   │
│  🔵 발주 요청일:   2025-01-13 16:30                   │
│  ⏳ 발주 승인일:   미정                               │
│  ⏳ 예상 발주일:   2025-01-20                         │
│  ⏳ 제작 완료일:   미정                               │
│  ⏳ 발송일:        미정                               │
│                                                        │
│  📄 시안 파일                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  [명함_시안_v1.pdf] 📥 다운로드                        │
│                                                        │
│  🚀 액션                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  [발주 승인하기] [시안 재업로드] [사용자에게 알림]    │
│                                                        │
│  📦 택배 정보 입력 (발주 승인 후 활성화)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │
│  택배회사: [선택하세요 ▼]                             │
│  운송장번호: [_______________]                         │
│  발송일: [2025-01-15]                                  │
│                                                        │
│  [저장하고 발송완료 처리]                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 데이터베이스 스키마 (확장)

### Workflow 모델 수정
```prisma
model Workflow {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              String   // "명함", "전단지", "홈페이지"
  status            String   // "대기", "시안중", "발주대기", "발주완료", "제작완료", "발송완료"

  // 📅 날짜 추적
  자료제출일        DateTime?
  시안업로드일      DateTime?
  발주요청일        DateTime?
  발주승인일        DateTime?
  예상발주일        DateTime? // 자동 계산
  제작완료일        DateTime?
  발송일            DateTime?

  // 파일
  시안URL           String?

  // 택배 정보
  택배회사          String?
  운송장번호        String?

  // 메타데이터
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // 로그
  logs              WorkflowLog[]
}

model WorkflowLog {
  id                String   @id @default(cuid())
  workflowId        String
  workflow          Workflow @relation(fields: [workflowId], references: [id])

  action            String   // "시안업로드", "발주승인", "택배발송"
  performedBy       String   // Admin ID
  performedByName   String   // Admin 이름
  previousStatus    String?
  newStatus         String

  metadata          Json?    // 추가 정보 (파일명, 택배번호 등)

  createdAt         DateTime @default(now())
}

model Notification {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  type              String
  channel           String   // "SMS", "EMAIL"
  title             String
  message           String   @db.Text
  status            String   // "전송중", "성공", "실패"

  // 발송 결과
  errorMessage      String?  @db.Text

  // 메타데이터
  sentBy            String?  // 수동 발송 시 Admin ID
  metadata          Json?

  sentAt            DateTime @default(now())
  createdAt         DateTime @default(now())
}
```

---

## API 엔드포인트

### 사용자 관리
```typescript
GET    /api/admin/users                // 사용자 목록
GET    /api/admin/users/:id            // 사용자 상세
POST   /api/admin/users                // 사용자 추가
PUT    /api/admin/users/:id            // 사용자 수정
DELETE /api/admin/users/:id            // 사용자 삭제
POST   /api/admin/users/import         // CSV 일괄 등록
GET    /api/admin/users/export         // CSV 다운로드
```

### 워크플로우 관리
```typescript
GET    /api/admin/workflows            // 워크플로우 목록
GET    /api/admin/workflows/:id        // 워크플로우 상세
POST   /api/admin/workflows/:id/upload-design  // 시안 업로드
POST   /api/admin/workflows/:id/approve-order  // 발주 승인
POST   /api/admin/workflows/:id/shipping       // 택배 정보 입력
```

**시안 업로드 예시:**
```typescript
// POST /api/admin/workflows/:id/upload-design
{
  "시안URL": "https://cdn.example.com/designs/123.pdf",
  "시안업로드일": "2025-01-12T10:15:00Z"
}

// Response
{
  "success": true,
  "workflow": {
    "id": "clx123",
    "status": "발주대기",
    "시안업로드일": "2025-01-12T10:15:00Z"
  },
  "notification": {
    "sent": true,
    "channel": ["SMS", "EMAIL"]
  }
}
```

**택배 정보 입력 예시:**
```typescript
// POST /api/admin/workflows/:id/shipping
{
  "택배회사": "CJ대한통운",
  "운송장번호": "123456789012",
  "발송일": "2025-01-15"
}

// Response
{
  "success": true,
  "workflow": {
    "id": "clx123",
    "status": "발송완료",
    "택배회사": "CJ대한통운",
    "운송장번호": "123456789012",
    "발송일": "2025-01-15T00:00:00Z"
  },
  "notification": {
    "sent": true,
    "message": "발송완료 알림이 발송되었습니다."
  }
}
```

### 알림 관리
```typescript
GET    /api/admin/notifications        // 알림 발송 이력
POST   /api/admin/notifications/send   // 수동 알림 발송
POST   /api/admin/notifications/retry  // 재발송
GET    /api/admin/notifications/export // CSV 다운로드
```

**수동 발송 예시:**
```typescript
// POST /api/admin/notifications/send
{
  "userIds": ["clx123", "clx456"],
  "type": "수동발송",
  "channels": ["SMS", "EMAIL"],
  "title": "[긴급] 마감일 연장 안내",
  "message": "안녕하세요...",
}
```

### 기수 관리
```typescript
GET    /api/admin/cohorts              // 기수 목록
POST   /api/admin/cohorts              // 기수 추가
PUT    /api/admin/cohorts/:id          // 기수 수정
DELETE /api/admin/cohorts/:id          // 기수 삭제
GET    /api/admin/cohorts/:id/stats    // 기수 통계
```

### 통계
```typescript
GET    /api/admin/dashboard/stats      // 전체 통계
GET    /api/admin/dashboard/chart-data // 차트 데이터
```

---

## 구현 우선순위

### Phase 1: Core (2주)
- [ ] 사용자 목록 및 상세
- [ ] 워크플로우 목록 및 상태 관리
- [ ] 시안 업로드 기능
- [ ] 택배번호 입력 기능

### Phase 2: Notification (1주)
- [ ] 알림 발송 이력 조회
- [ ] 수동 알림 발송
- [ ] 재발송 기능

### Phase 3: Advanced (1주)
- [ ] 대시보드 통계 및 차트
- [ ] CSV 일괄 등록/다운로드
- [ ] 워크플로우 로그 추적

---

## UI 컴포넌트 (shadcn/ui 기반)

### 사용 컴포넌트
```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

### 상태 배지
```typescript
const statusBadgeVariant = {
  대기: 'secondary',
  시안중: 'default',
  발주대기: 'warning',
  발주완료: 'info',
  제작완료: 'success',
  발송완료: 'success',
} as const;

<Badge variant={statusBadgeVariant[workflow.status]}>
  {workflow.status}
</Badge>
```

---

이 기획서를 바탕으로 관리자 대시보드를 단계적으로 구현할 수 있습니다!
