# 모바일 최적화 서류 제출 시스템 구현 가이드

## 📱 구현 개요

모바일 우선(Mobile-First) 접근 방식으로 서류 제출 및 진행 상황 추적 시스템을 구현했습니다.

## ✨ 구현된 주요 기능

### 1. 데이터베이스 스키마 강화
**파일**: `prisma/schema.prisma`

추가된 필드:
```prisma
model Submission {
  // 진행 상태 추적
  submissionStatus String @default("작성중") // "작성중" | "검토중" | "보완필요" | "완료"
  progressPercentage Int @default(0) // 0-100

  // 자동저장 메타데이터
  lastAutoSaveAt DateTime?
  autoSaveData   Json?
}
```

### 2. 모바일 최적화 컴포넌트

#### 📤 MobileFileUpload 컴포넌트
**파일**: `components/ui/mobile-file-upload.tsx`

**주요 기능**:
- ✅ 터치 친화적 인터페이스 (최소 터치 영역 48x48px)
- 📷 모바일 카메라 직접 촬영 기능 (`capture="environment"`)
- 🖼️ 실시간 이미지 미리보기
- ✔️ 클라이언트 사이드 파일 검증
  - 파일 크기 제한
  - 파일 형식 검증
  - 이미지 해상도 검증 (예: 1000px 이하)
- 📊 업로드 진행 상태 표시
- ⚠️ 친절한 오류 메시지

**사용 예시**:
```tsx
<MobileFileUpload
  label="프로필사진"
  accept="image/*"
  currentFileUrl={submission?.프로필사진URL}
  onUpload={(file) => handleFileUpload("프로필사진URL", file)}
  required
  helpText="1000px 이하"
  allowCamera
  validateImage
  maxImageDimension={1000}
/>
```

#### 📊 SubmissionProgress 컴포넌트
**파일**: `components/ui/submission-progress.tsx`

**주요 기능**:
- 전체 진행률 표시 (0-100%)
- 상태별 시각적 구분 (색상 + 아이콘)
- 필수 항목 체크리스트
- 완료/미완료 항목 명확한 강조

**상태 종류**:
- 🟡 작성중 - 노란색
- 🔵 검토중 - 파란색
- 🟠 보완필요 - 오렌지색
- 🟢 완료 - 초록색

#### 📅 StatusTimeline 컴포넌트
**파일**: `components/ui/status-timeline.tsx`

**주요 기능**:
- 수직 타임라인 (모바일 최적화)
- 단계별 아이콘 및 설명
- 현재 진행 단계 강조
- 타임스탬프 표시
- 반응형 디자인 (데스크톱에서는 가로 타임라인 지원)

**사용 예시**:
```tsx
const events: TimelineEvent[] = [
  {
    id: "submitted",
    title: "자료 제출 완료",
    description: "제출하신 자료를 확인 중입니다",
    status: "completed",
    timestamp: new Date(),
    icon: "file",
  },
  // ...
];

<StatusTimeline events={events} orientation="vertical" />
```

### 3. 자동 저장 기능

#### useAutoSave Hook
**파일**: `lib/hooks/useAutoSave.ts`

**주요 기능**:
- 입력 내용 자동 저장 (기본 2초 지연)
- 변경 감지 및 중복 저장 방지
- 저장 상태 추적 (저장 중, 마지막 저장 시간, 에러)
- 에러 핸들링

**사용 예시**:
```tsx
const autoSaveState = useAutoSave(formData, {
  delay: 2000,
  onSave: async (data) => {
    await fetch("/api/submission/autosave", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  onError: (error) => console.error(error),
});

// 저장 상태 표시
{autoSaveState.isSaving && "저장 중..."}
{autoSaveState.lastSaved && `마지막 저장: ${autoSaveState.lastSaved}`}
```

#### useDebounce Hook
**파일**: `lib/hooks/useDebounce.ts`

입력 값을 디바운싱하여 불필요한 API 호출 방지

### 4. 모바일 최적화 페이지

#### 📝 서류 제출 페이지
**파일**: `app/dashboard/submission-mobile/page.tsx`

**UX 원칙 적용**:

1. **싱글 컬럼 레이아웃**
   - 모든 입력 필드를 수직으로 배치
   - 가로 스크롤 완전 방지

2. **섹션 기반 네비게이션**
   - 4개 섹션: 기본정보, 인쇄물, 마케팅, 홈페이지
   - Sticky 네비게이션 바
   - 활성 섹션 명확한 표시

3. **터치 최적화**
   - 버튼 최소 높이 48px
   - 입력 필드 높이 48px (h-12)
   - Active 피드백 (`active:scale-[0.98]`)

4. **진행 상황 실시간 표시**
   - 상단에 전체 진행률 표시
   - 자동 저장 상태 표시
   - 필수 항목 체크리스트

5. **모바일 카메라 활용**
   - 서류 직접 촬영 가능
   - 갤러리에서 선택 가능

#### 📈 진행 상황 대시보드
**파일**: `app/dashboard/status/page.tsx`

**주요 기능**:
1. **전체 제출 현황**
   - 진행률 및 상태 표시
   - 필수 항목 체크리스트

2. **인쇄물별 제작 현황**
   - 명함, 명찰, 대봉투, 자문계약서 각각 추적
   - 타임라인 형식으로 진행 단계 표시
   - 시안 확인 버튼
   - 택배 추적 정보

3. **시각적 피드백**
   - 단계별 아이콘 및 색상
   - 완료/진행중/대기 명확한 구분
   - 애니메이션 효과

## 🎨 디자인 시스템

### 색상 팔레트
```css
/* 상태별 색상 */
작성중:   yellow-700  (노란색)
검토중:   blue-700    (파란색)
보완필요: orange-700  (오렌지색)
완료:     green-700   (초록색)

/* 워크플로우 상태 */
대기:     gray-700
시안중:   blue-700
발주대기: orange-700
발주완료: purple-700
제작완료: green-700
발송완료: teal-700
```

### 반응형 브레이크포인트
```css
sm: 640px   /* 태블릿 */
md: 768px   /* 작은 데스크톱 */
lg: 1024px  /* 데스크톱 */
```

### 터치 영역 최소 크기
- 버튼: 48px × 48px 이상
- 입력 필드: 높이 48px (h-12)
- 아이콘: 20px (w-5 h-5) ~ 24px (w-6 h-6)

## 🔌 필요한 API 엔드포인트

### 1. 제출 데이터 조회
```typescript
GET /api/submission
Response: {
  id: string;
  브랜드명?: string;
  // ... 기타 필드
  submissionStatus: string;
  progressPercentage: number;
}
```

### 2. 제출 데이터 저장
```typescript
POST /api/submission
Body: { [field]: value }
Response: { success: boolean }
```

### 3. 자동 저장
```typescript
POST /api/submission/autosave
Body: { [field]: value, ... }
Response: { success: boolean }
```

### 4. 파일 업로드
```typescript
POST /api/upload
Body: FormData { file, field }
Response: { url: string }
```

### 5. 워크플로우 조회
```typescript
GET /api/workflows
Response: Workflow[]
```

## 📱 모바일 최적화 체크리스트

- ✅ **싱글 컬럼 레이아웃**: 모든 컨텐츠 수직 배치
- ✅ **터치 친화적**: 버튼/입력 필드 최소 48px
- ✅ **카메라 활용**: 서류 직접 촬영 기능
- ✅ **자동 저장**: 2초 디바운싱 후 자동 저장
- ✅ **진행 상황 표시**: 실시간 진행률 및 상태
- ✅ **명확한 네비게이션**: Sticky 섹션 네비게이션
- ✅ **시각적 피드백**: 로딩, 성공, 에러 상태 표시
- ✅ **반응형 디자인**: 모바일 → 태블릿 → 데스크톱
- ✅ **접근성**: 명확한 라벨 및 도움말
- ✅ **성능 최적화**: 디바운싱, 지연 로딩

## 🚀 배포 전 확인사항

### 1. 데이터베이스 마이그레이션
```bash
npx prisma db push
```

### 2. 환경 변수 설정
`.env` 파일에 다음 추가:
```env
# 파일 업로드 (예: AWS S3)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=ap-northeast-2

# 또는 Cloudflare R2
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET=your_bucket
```

### 3. API 라우트 구현
다음 API 엔드포인트를 구현해야 합니다:
- `/api/submission` (GET, POST)
- `/api/submission/autosave` (POST)
- `/api/upload` (POST)
- `/api/workflows` (GET)

### 4. 파일 업로드 구현
`app/api/upload/route.ts` 예시:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const field = formData.get("field") as string;

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  // 파일을 저장하거나 S3에 업로드
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 예시: 로컬 저장
  const uploadDir = join(process.cwd(), "public", "uploads");
  const filename = `${Date.now()}-${file.name}`;
  const filepath = join(uploadDir, filename);

  await writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;

  return NextResponse.json({ url });
}
```

## 📚 사용자 가이드

### 서류 제출 방법
1. **섹션 선택**: 상단 네비게이션에서 작성할 섹션 선택
2. **정보 입력**: 각 필드 작성 (자동 저장됨)
3. **파일 업로드**:
   - 📁 파일 선택: 기존 파일 선택
   - 📷 카메라 촬영: 직접 촬영 (모바일만)
4. **진행 확인**: 상단의 진행률 바에서 완료 상태 확인

### 진행 상황 확인
1. 대시보드에서 전체 제출 현황 확인
2. 각 인쇄물별 제작 단계 확인
3. 시안 완료 시 확인 버튼으로 확인
4. 택배 발송 시 운송장 번호로 추적

## 🔧 트러블슈팅

### Prisma 생성 오류
```bash
# 프로세스 종료 후 재시도
npx prisma generate
```

### 파일 업로드 실패
- 파일 크기 제한 확인 (기본 10MB)
- 서버 업로드 디렉토리 권한 확인
- Next.js 설정에서 body size 제한 확인

### 자동 저장 작동 안함
- 브라우저 콘솔에서 네트워크 오류 확인
- API 엔드포인트 구현 여부 확인
- CORS 설정 확인

## 📈 향후 개선 사항

1. **오프라인 지원**: Service Worker로 오프라인 모드 지원
2. **PWA**: 홈 화면 추가 기능
3. **푸시 알림**: 제작 단계 변경 시 알림
4. **다국어 지원**: i18n 적용
5. **성능 최적화**:
   - 이미지 최적화 (WebP)
   - 코드 스플리팅
   - CDN 적용

---

**작성일**: 2025-10-23
**버전**: 1.0.0
**작성자**: Claude Code
