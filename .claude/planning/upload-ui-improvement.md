# 업로드 UI 개선 기획서

## 📋 현황 분석

### 업로드 UI가 사용되는 위치
1. **자료제출 페이지** (`app/dashboard/submission/page.tsx`)
   - 로고, 사업자등록증, 프로필사진, 대표자신분증, 통신서비스이용증명원, 신용카드 앞면
   - 총 6개의 파일 업로드 필드

2. **워크플로우 관리** (`app/admin/(dashboard)/workflows/workflow-actions.tsx`)
   - 시안 파일 업로드 (AI, JPEG, PNG)

3. **기타**
   - 공지사항, 커뮤니케이션, 사용자 관리 등

### 현재 UI 문제점
1. **시각적 계층 부족**
   - 업로드 영역과 다른 요소 간 구분이 약함
   - 중요도가 시각적으로 표현되지 않음

2. **일관성 부족**
   - 페이지마다 다른 스타일 적용
   - border-dashed, hover 효과 등이 일관적이지 않음

3. **정보 전달 부족**
   - 업로드 가능한 파일 형식이 명확하지 않음
   - 파일 크기 제한 안내 없음
   - 드래그 앤 드롭 지원 안내 없음

---

## 🎯 개선 목표

### 1. 명확한 계층 구조
- **3단계 계층화**
  - Level 1 (최상위): 섹션 타이틀 + 설명
  - Level 2 (중간): 업로드 영역 (강조)
  - Level 3 (하위): 도움말 텍스트

### 2. 시각적 강조
- 업로드 영역을 배경색, 테두리, 그림자로 강조
- 호버 시 더 강한 피드백
- 아이콘 + 텍스트로 명확한 액션 표시

### 3. 사용자 경험 개선
- 드래그 앤 드롭 지원
- 파일 형식 및 크기 안내
- 업로드 진행률 표시
- 에러 메시지 개선

---

## 🎨 디자인 시스템

### 색상 체계
```css
/* 기본 상태 */
--upload-bg: #F9FAFB (neutral-50)
--upload-border: #E5E7EB (neutral-200)
--upload-text: #6B7280 (neutral-500)

/* 호버 상태 */
--upload-hover-bg: #EFF6FF (blue-50)
--upload-hover-border: #3B82F6 (blue-500)
--upload-hover-text: #1D4ED8 (blue-700)

/* 드래그 오버 상태 */
--upload-drag-bg: #DBEAFE (blue-100)
--upload-drag-border: #2563EB (blue-600)

/* 업로드 완료 */
--upload-success-bg: #F0FDF4 (green-50)
--upload-success-border: #22C55E (green-500)
--upload-success-text: #15803D (green-700)

/* 에러 상태 */
--upload-error-bg: #FEF2F2 (red-50)
--upload-error-border: #EF4444 (red-500)
--upload-error-text: #DC2626 (red-600)
```

### 타이포그래피
```css
/* 섹션 타이틀 */
font-size: 1rem (16px)
font-weight: 600 (semibold)
color: neutral-900

/* 업로드 텍스트 */
font-size: 0.875rem (14px)
font-weight: 500 (medium)
color: neutral-700

/* 도움말 텍스트 */
font-size: 0.75rem (12px)
font-weight: 400 (normal)
color: neutral-500
```

### 스페이싱
```css
/* 섹션 간격 */
margin-bottom: 2rem (32px)

/* 내부 패딩 */
padding: 1.5rem (24px)  /* 큰 업로드 영역 */
padding: 1rem (16px)    /* 작은 업로드 영역 */

/* 요소 간 간격 */
gap: 0.75rem (12px)
```

---

## 📐 컴포넌트 구조

### FileUpload 공통 컴포넌트

```tsx
interface FileUploadProps {
  // 필수
  label: string;              // "사업자등록증"
  accept: string;             // "image/*,application/pdf"
  onChange: (file: File) => void;

  // 선택
  description?: string;       // "사업자등록증 또는 고유번호증을 업로드하세요"
  maxSize?: number;          // MB 단위 (기본: 10MB)
  currentFile?: string;      // 현재 업로드된 파일 URL
  required?: boolean;        // 필수 여부
  disabled?: boolean;
  uploading?: boolean;
  error?: string;

  // 레이아웃
  variant?: 'default' | 'compact';  // 크기 변형
  showPreview?: boolean;            // 이미지 미리보기 표시
}
```

### 계층 구조 예시

```
┌─────────────────────────────────────────┐
│ 📄 사업자등록증               [필수]    │ ← Level 1: 타이틀 + 뱃지
├─────────────────────────────────────────┤
│ 사업자등록증 또는 고유번호증을 업로드   │ ← Level 1: 설명
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │  [파일 아이콘]                      │ │
│ │                                     │ │
│ │  파일을 선택하거나 여기에 드롭      │ │ ← Level 2: 업로드 영역
│ │                                     │ │    (강조 배경 + 테두리)
│ │  JPG, PNG, PDF (최대 10MB)         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ℹ️ 사업자등록증이 없는 경우...         │ ← Level 3: 도움말
└─────────────────────────────────────────┘
```

---

## 🔧 구현 계획

### Phase 1: 공통 컴포넌트 작성
1. `components/ui/file-upload.tsx` 생성
2. 드래그 앤 드롭 기능 구현
3. 파일 검증 로직 추가
4. 업로드 진행률 표시

### Phase 2: 자료제출 페이지 적용
1. 기존 업로드 UI를 FileUpload 컴포넌트로 교체
2. 각 필드별 설명 추가
3. 필수/선택 표시 개선

### Phase 3: 워크플로우 관리 적용
1. 시안 업로드 UI 개선
2. 업로드 이력 표시 개선
3. 미리보기 기능 강화

### Phase 4: 기타 페이지 적용
1. 공지사항, 커뮤니케이션 등
2. 일관성 검증 및 조정

---

## 📊 개선 효과 측정

### 정량적 지표
- 업로드 성공률 증가
- 업로드 소요 시간 감소
- 에러 발생률 감소

### 정성적 지표
- 사용자 만족도 조사
- 인터페이스 명확성 평가
- 접근성 개선 평가

---

## 🎬 예시: Before & After

### Before (현재)
```tsx
<label className="block">
  <input
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(e) => {
      if (e.target.files?.[0]) {
        handleFileUpload("로고URL", e.target.files[0]);
      }
    }}
    disabled={uploading}
  />
  <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 cursor-pointer transition-all">
    <Upload className="w-5 h-5 text-gray-600" />
    <span className="text-gray-600">파일 선택</span>
  </div>
</label>
```

### After (개선안)
```tsx
<FileUpload
  label="로고"
  description="회사 또는 브랜드 로고를 업로드하세요"
  accept="image/*"
  maxSize={5}
  required
  currentFile={submission.로고URL}
  onChange={(file) => handleFileUpload("로고URL", file)}
  uploading={uploading}
  showPreview
/>
```

렌더링 결과:
```
┌──────────────────────────────────────────┐
│ 🎨 로고                          [필수]  │
├──────────────────────────────────────────┤
│ 회사 또는 브랜드 로고를 업로드하세요     │
├──────────────────────────────────────────┤
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│ ┃  [Upload 아이콘]                  ┃   │
│ ┃                                   ┃   │
│ ┃  파일을 선택하거나 여기에 드롭     ┃   │
│ ┃                                   ┃   │ ← 강조된 업로드 영역
│ ┃  JPG, PNG (최대 5MB)             ┃   │   (배경색 + 굵은 테두리)
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│                                          │
│ ℹ️ 고해상도 이미지를 권장합니다          │
└──────────────────────────────────────────┘
```

---

## ✅ 체크리스트

### 디자인
- [ ] 3단계 계층 구조 적용
- [ ] 색상 시스템 정의
- [ ] 타이포그래피 규칙 정의
- [ ] 호버/포커스 상태 디자인
- [ ] 에러 상태 디자인

### 기능
- [ ] 드래그 앤 드롭 지원
- [ ] 파일 형식 검증
- [ ] 파일 크기 검증
- [ ] 업로드 진행률 표시
- [ ] 에러 메시지 표시
- [ ] 미리보기 기능

### 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] aria-label 설정
- [ ] 포커스 표시
- [ ] 에러 알림

### 성능
- [ ] 이미지 압축
- [ ] 청크 업로드 (큰 파일)
- [ ] 로딩 상태 관리
- [ ] 메모리 누수 방지

---

**작성일**: 2025-11-12
**버전**: 1.0
**담당**: Claude Code
