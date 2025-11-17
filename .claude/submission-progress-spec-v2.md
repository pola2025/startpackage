# 자료제출 진행률 시스템 재설계 v2 - 최종 기획서

**작성일**: 2025-11-12
**버전**: 2.0
**목적**: 사용자 피드백 반영한 진행률 구조 전면 재설계

---

## 📋 최종 요구사항

### 진행률 섹션 (총 7개)

| 순서 | 섹션 이름 | 클릭 시 이동 | 추적 필드 | 계산 방식 |
|------|----------|------------|----------|----------|
| 1 | **브랜드정보** | 기본정보 탭 | 브랜드명 | 1개 필드 |
| 2 | **사업자등록증** | 인쇄물 탭 | 사업자등록증URL | 1개 파일 |
| 3 | **프로필사진** | 인쇄물 탭 | 프로필사진URL | 1개 파일 |
| 4 | **명함스타일** | 인쇄물 탭 | 명함시안 OR 명함색상 | 둘 중 하나 |
| 5 | **로고** | 로고 탭 | 로고URL, 로고선호스타일 등 | 여러 필드 |
| 6 | **홈페이지** | 홈페이지 탭 | 홈페이지컬러컨셉, 홈페이지스타일 | 2개 필드 |
| 7 | **마케팅** | 마케팅 탭 | InstagramID/PW, 네이버검색광고ID/PW | 4개 필드 |

### 제거된 항목
- ❌ 업종 (진행률에서 제거)
- ❌ 주소 (진행률에서 제거)
- ❌ 이름, 연락처 (User 테이블 필드, 진행률에서 제거)

---

## 🎯 구현 상세

### 1. 브랜드정보
```typescript
{
  name: "브랜드정보",
  label: "브랜드정보",
  fields: ["브랜드명"],
  href: "basic#brand-section",
  // 계산: 브랜드명이 있으면 1/1 (100%)
}
```

**섹션 ID**: `brand-section`
**위치**: 기본정보 탭 > 브랜드명 입력 필드

---

### 2. 사업자등록증
```typescript
{
  name: "사업자등록증",
  label: "사업자등록증",
  fields: ["사업자등록증URL"],
  href: "print#business-license-section",
  // 계산: 사업자등록증URL이 있으면 1/1 (100%)
}
```

**섹션 ID**: `business-license-section`
**위치**: 인쇄물 탭 > 사업자등록증 업로드 영역

---

### 3. 프로필사진
```typescript
{
  name: "프로필사진",
  label: "프로필사진",
  fields: ["프로필사진URL"],
  href: "print#profile-photo-section",
  // 계산: 프로필사진URL이 있으면 1/1 (100%)
}
```

**섹션 ID**: `profile-photo-section`
**위치**: 인쇄물 탭 > 프로필사진 업로드 영역

---

### 4. 명함스타일
```typescript
{
  name: "명함스타일",
  label: "명함스타일",
  fields: ["명함시안", "명함색상"],
  href: "print#namecard-section",
  // 계산: 명함시안 OR 명함색상 중 하나라도 있으면 1/1 (100%)
}
```

**섹션 ID**: `namecard-section`
**위치**: 인쇄물 탭 > 명함 디자인 선택 영역

**계산 로직**:
```typescript
const namecardCompleted =
  (!isEmpty(submission.명함시안) || !isEmpty(submission.명함색상)) ? 1 : 0;
```

---

### 5. 로고
```typescript
{
  name: "로고",
  label: "로고",
  fields: [
    "로고선호스타일",
    "로고선호색상",
    "로고선호폰트",
    "로고제작요청사항"
  ],
  href: "logo#logo-section",
  // 계산: 4개 필드 중 완료된 개수 (예: 3/4 = 75%)
}
```

**섹션 ID**: `logo-section` (이미 존재)
**위치**: 로고 탭 > 로고 파일 업로드 영역

**로고URL 제외 이유**: 파일은 선택사항, 스타일 정보만 필수

---

### 6. 홈페이지
```typescript
{
  name: "홈페이지",
  label: "홈페이지",
  fields: ["홈페이지컬러컨셉", "홈페이지스타일"],
  href: "website#homepage-section",
  // 계산: 2개 필드 중 완료된 개수 (예: 1/2 = 50%)
}
```

**섹션 ID**: `homepage-section`
**위치**: 홈페이지 탭 > 홈페이지 스타일 선택 + 컬러 컨셉 영역

---

### 7. 마케팅
```typescript
{
  name: "마케팅",
  label: "마케팅",
  fields: [
    "InstagramID",
    "InstagramPW",
    "네이버검색광고ID",
    "네이버검색광고PW"
  ],
  href: "marketing#account-section",
  // 계산: 4개 필드 중 완료된 개수 (예: 2/4 = 50%)
}
```

**섹션 ID**: `account-section` (이미 존재)
**위치**: 마케팅 탭 > Instagram + 네이버 검색광고 계정 입력 영역

---

## 📊 전체 진행률 계산

```typescript
총 필드 수 = 1 + 1 + 1 + 1 + 4 + 2 + 4 = 14개
(브랜드정보 + 사업자등록증 + 프로필사진 + 명함스타일 + 로고 + 홈페이지 + 마케팅)

전체 진행률 = (완료된 필드 수 / 14) * 100
```

**예시**:
- 브랜드명: ✅ (1/1)
- 사업자등록증: ✅ (1/1)
- 프로필사진: ✅ (1/1)
- 명함스타일: ✅ (1/1)
- 로고: ⚠️ (3/4)
- 홈페이지: ⚠️ (1/2)
- 마케팅: ❌ (0/4)

= (1+1+1+1+3+1+0) / 14 = 8/14 = 57%

---

## 🎨 UI 표시 예시

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
전체 진행률: 57%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 브랜드정보        1/1   100%  [초록]
✓ 사업자등록증      1/1   100%  [초록]
✓ 프로필사진        1/1   100%  [초록]
✓ 명함스타일        1/1   100%  [초록]
⚠ 로고             3/4    75%  [노랑]
⚠ 홈페이지          1/2    50%  [노랑]
○ 마케팅           0/4     0%  [회색]
```

---

## 🔗 클릭 네비게이션

| 클릭 항목 | URL | 결과 |
|----------|-----|------|
| 브랜드정보 | `/dashboard/submission?tab=basic#brand-section` | 기본정보 탭 → 브랜드명 |
| 사업자등록증 | `/dashboard/submission?tab=print#business-license-section` | 인쇄물 탭 → 사업자등록증 업로드 |
| 프로필사진 | `/dashboard/submission?tab=print#profile-photo-section` | 인쇄물 탭 → 프로필사진 업로드 |
| 명함스타일 | `/dashboard/submission?tab=print#namecard-section` | 인쇄물 탭 → 명함 선택 |
| 로고 | `/dashboard/submission?tab=logo#logo-section` | 로고 탭 → 로고 정보 |
| 홈페이지 | `/dashboard/submission?tab=website#homepage-section` | 홈페이지 탭 → 스타일/컬러 |
| 마케팅 | `/dashboard/submission?tab=marketing#account-section` | 마케팅 탭 → 계정 정보 |

---

## 🛠️ 구현 파일 및 위치

### 1. `lib/submission-progress.ts`

**수정 내용**:
- `REQUIRED_FIELDS` 전체 재정의
- 7개 섹션 계산 로직 구현
- 명함스타일 OR 로직 추가
- href 값 업데이트

### 2. `app/dashboard/submission/page.tsx`

**추가할 섹션 ID**:

| 탭 | ID | 위치 (대략적 라인) |
|----|----|--------------------|
| basic | `brand-section` | 653 (브랜드명 입력 영역) |
| print | `business-license-section` | 1289 (기존 business-files) |
| print | `profile-photo-section` | 1349 (프로필사진 영역) |
| print | `namecard-section` | 명함 선택 영역 (찾아야 함) |
| logo | `logo-section` | 813 (이미 존재) |
| website | `homepage-section` | 홈페이지 스타일 선택 영역 (찾아야 함) |
| marketing | `account-section` | 1535 (이미 존재) |

---

## ✅ 구현 체크리스트

### Phase 1: 로직 수정
- [ ] `lib/submission-progress.ts` REQUIRED_FIELDS 재정의
- [ ] 7개 섹션 계산 로직 구현
- [ ] 명함스타일 OR 로직 추가
- [ ] href 값 업데이트

### Phase 2: 섹션 ID 추가
- [ ] basic 탭: brand-section 추가
- [ ] print 탭: business-license-section 이름 확인/변경
- [ ] print 탭: profile-photo-section 추가
- [ ] print 탭: namecard-section 추가
- [ ] website 탭: homepage-section 추가

### Phase 3: 테스트
- [ ] 브랜드정보 클릭 → basic 탭 이동 확인
- [ ] 사업자등록증 클릭 → print 탭 이동 확인
- [ ] 프로필사진 클릭 → print 탭 이동 확인
- [ ] 명함스타일 클릭 → print 탭 이동 확인
- [ ] 로고 클릭 → logo 탭 이동 확인
- [ ] 홈페이지 클릭 → website 탭 이동 확인
- [ ] 마케팅 클릭 → marketing 탭 이동 확인
- [ ] 각 섹션으로 스크롤 확인

---

## 🎯 예상 효과

1. **단순화**: 7개 섹션으로 명확하게 정리
2. **직관성**: 각 섹션이 실제 탭과 1:1 매칭
3. **완성도**: 파일 업로드 필드 진행률 반영
4. **사용성**: 클릭 한 번에 정확한 입력 영역으로 이동

---

**최종 승인 대기 중**
