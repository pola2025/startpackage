# 자료제출 진행률 시스템 재설계 기획서

**작성일**: 2025-11-12
**목적**: 진행률 클릭 네비게이션 오류 해결 및 구조 정리
**상태**: 기획 완료 → 구현 대기

---

## 📋 문제 분석

### 1. 현재 구조 (5개 탭)

| 탭 ID | 탭 이름 | 주요 필드 |
|-------|---------|-----------|
| `basic` | 기본 정보 | 브랜드명, 업종, 주소, 대표번호, 이메일, 은행명, 계좌번호, 인쇄물받을주소 |
| `logo` | 로고 디자인 | 로고URL, 로고선호스타일, 로고선호색상, 로고선호폰트, 로고제작요청사항, 홈페이지컬러컨셉 |
| `print` | 인쇄물 | 사업자등록증URL, 프로필사진URL |
| `marketing` | 마케팅 정보 | InstagramID/PW, 네이버검색광고ID/PW, 네이버클라우드ID/PW, MetaBusinessID/PW |
| `website` | 홈페이지 제작 | 아임웹ID/PW/관리자PW, 홈페이지스타일, Gmail계정/앱비밀번호 |

### 2. 현재 진행률 구조 (3개 섹션)

| 섹션 | 추적 필드 | 현재 href | 문제점 |
|------|-----------|-----------|--------|
| 로고제작 | 브랜드명, 로고선호스타일, 로고선호색상, 로고선호폰트, 로고제작요청사항, 홈페이지컬러컨셉 | `logo#logo-section` | ✅ 정상 |
| 인쇄물제작 | 이름(user), 연락처(user), 주소 | `basic#business-files` | ❌ **business-files는 print 탭에 있음** |
| 계정정보 | 아임웹ID/PW, InstagramID/PW, 네이버검색광고ID/PW | `marketing#account-section` | ⚠️ **아임웹은 website 탭에 있음** |

### 3. 핵심 문제점

1. **"인쇄물제작" 섹션이 잘못된 탭을 가리킴**
   - 추적 필드: 이름, 연락처, 주소 (모두 `basic` 탭)
   - 현재 href: `basic#business-files`
   - 실제 `business-files` 위치: `print` 탭 (line 1289)
   - **결과**: 클릭 시 basic 탭으로 이동하지만 business-files가 없어 스크롤 실패

2. **"계정정보" 섹션이 2개 탭에 걸쳐 있음**
   - Instagram, 네이버 계정: `marketing` 탭
   - 아임웹 계정: `website` 탭
   - 현재 href: `marketing#account-section`
   - **결과**: 아임웹 계정은 website 탭에서만 입력 가능한데 진행률에서는 marketing으로 이동

3. **파일 업로드 필드가 진행률에 미포함**
   - 사업자등록증URL (print 탭)
   - 프로필사진URL (print 탭)
   - 로고URL (logo 탭)
   - **결과**: 사용자가 파일을 업로드해도 진행률에 반영 안됨

---

## 🎯 해결 방안

### 옵션 A: 진행률 구조 유지 + href 수정 (권장)

현재 3개 섹션 구조를 유지하되, href를 실제 입력 위치에 맞게 수정

#### 수정 사항:

| 섹션 | 기존 href | 새 href | 이동할 탭 | 스크롤 대상 |
|------|-----------|---------|-----------|------------|
| 로고제작 | `logo#logo-section` | `logo#logo-section` | logo | 로고 파일 업로드 영역 |
| 인쇄물제작 | `basic#business-files` | `print#business-files` | print | 사업자등록증/프로필사진 업로드 영역 |
| 계정정보 | `marketing#account-section` | `marketing#account-section` | marketing | 네이버/Instagram 계정 입력 영역 |

#### 추가 작업:

1. **아임웹 계정 별도 처리**
   - 아임웹ID/PW를 "계정정보" 섹션에서 제외
   - 새로운 "홈페이지 정보" 섹션 추가 (선택사항)
   - 또는: 아임웹 계정을 marketing 탭에 추가 ID로 표시 (비추천)

2. **파일 업로드 진행률 추가 (선택사항)**
   - "인쇄물제작" 섹션에 사업자등록증URL, 프로필사진URL 추가
   - "로고제작" 섹션에 로고URL 추가
   - 단, User 테이블 필드(이름, 연락처)와 Submission 테이블 필드(파일 URL)를 함께 추적해야 함

---

### 옵션 B: 진행률 구조 재설계 (5개 섹션)

탭 구조와 1:1 매칭되도록 진행률을 5개 섹션으로 확장

#### 새로운 진행률 구조:

| 섹션 | 추적 필드 | href | 비고 |
|------|-----------|------|------|
| 기본정보 | 브랜드명, 업종, 주소 | `basic#basic-info` | 필수 3개 필드만 |
| 로고제작 | 로고선호스타일, 로고선호색상, 로고선호폰트, 로고제작요청사항, 홈페이지컬러컨셉 | `logo#logo-section` | 로고URL은 선택사항 |
| 인쇄물 | 사업자등록증URL, 프로필사진URL | `print#business-files` | 필수 파일 |
| 마케팅 | InstagramID/PW, 네이버검색광고ID/PW | `marketing#account-section` | 선택사항 |
| 홈페이지 | 아임웹ID/PW, 홈페이지스타일 | `website#website-section` | 선택사항 |

#### 장단점:

**장점:**
- 탭 구조와 완벽히 일치
- 사용자가 각 탭별 진행률을 직관적으로 파악
- 파일 업로드도 진행률에 포함 가능

**단점:**
- 진행률 섹션이 너무 많아져 UI가 복잡해질 수 있음
- 구현 범위가 커짐 (REQUIRED_FIELDS 전체 재구성 필요)

---

## 💡 권장 방안: 옵션 A (최소 변경)

### 이유:
1. **즉시 적용 가능**: href만 수정하면 바로 해결
2. **UI 변경 최소화**: 기존 3개 섹션 유지
3. **사용자 혼란 없음**: 이미 익숙한 구조 유지
4. **단계적 개선 가능**: 추후 필요시 옵션 B로 확장 가능

### 구현 계획:

#### 1단계: href 수정 (긴급)

**파일**: `lib/submission-progress.ts`

```typescript
// Line 111: 인쇄물제작 섹션
sections.push({
  name: "인쇄물제작",
  label: REQUIRED_FIELDS.인쇄물제작.label,
  fields: printFields,
  completed: printCompleted,
  total: printFields.length,
  percentage: Math.round((printCompleted / printFields.length) * 100),
  isComplete: printCompleted === printFields.length,
  href: "print#business-files", // ✅ basic → print로 변경
});
```

#### 2단계: 아임웹 계정 분리 (중요도: 중)

**방법 1: 계정정보 섹션에서 아임웹 제외**

```typescript
// REQUIRED_FIELDS.계정정보에서 아임웹ID/PW 제거
const REQUIRED_FIELDS = {
  // ...
  계정정보: {
    label: "계정 정보",
    fields: [
      "InstagramID",
      "InstagramPW",
      "네이버검색광고ID",
      "네이버검색광고PW",
      // "아임웹ID", // 제거
      // "아임웹PW", // 제거
    ],
  },
};
```

**방법 2: 홈페이지 정보 섹션 신규 추가**

```typescript
const REQUIRED_FIELDS = {
  // ...
  홈페이지정보: {
    label: "홈페이지 정보",
    fields: ["아임웹ID", "아임웹PW", "홈페이지스타일"],
  },
};

// 진행률 계산 시 추가
sections.push({
  name: "홈페이지정보",
  label: REQUIRED_FIELDS.홈페이지정보.label,
  fields: websiteFields,
  completed: websiteCompleted,
  total: websiteFields.length,
  percentage: Math.round((websiteCompleted / websiteFields.length) * 100),
  isComplete: websiteCompleted === websiteFields.length,
  href: "website#website-section",
});
```

#### 3단계: ID 추가 (필수)

**파일**: `app/dashboard/submission/page.tsx`

```tsx
// Line 1989: 아임웹 계정 영역에 ID 추가
<div id="website-section" className="space-y-4 p-4 rounded-lg border-2 border-purple-200 bg-purple-50/50">
  <Label className="text-sm sm:text-base font-semibold">아임웹 계정 정보</Label>
  {/* ... */}
</div>
```

#### 4단계: 파일 업로드 진행률 추가 (선택사항)

**고려사항:**
- 사업자등록증과 프로필사진은 필수 파일
- 현재는 진행률에 반영되지 않아 사용자가 파일만 업로드하고 다른 정보를 입력하지 않을 수 있음
- 파일 URL 필드를 "인쇄물제작" 섹션에 추가하는 것을 권장

```typescript
const REQUIRED_FIELDS = {
  // ...
  인쇄물제작: {
    label: "인쇄물 제작 정보",
    fields: [
      "이름",
      "연락처",
      "주소",
      "사업자등록증URL", // 추가
      "프로필사진URL",  // 추가
    ],
  },
};
```

---

## 📊 필드별 위치 매핑표

### 전체 필드 정리

| 필드명 | 데이터 소스 | 현재 탭 | 진행률 추적 여부 | 제안 |
|--------|-------------|---------|-----------------|------|
| 브랜드명 | Submission | basic | ✅ 로고제작 | 유지 |
| 업종 | Submission | basic | ❌ | 추가 고려 |
| 주소 | Submission | basic | ✅ 인쇄물제작 | 유지 |
| 대표번호 | Submission | basic | ❌ | - |
| 이메일 | Submission | basic | ❌ | - |
| 은행명 | Submission | basic | ❌ | - |
| 계좌번호 | Submission | basic | ❌ | - |
| 인쇄물받을주소 | Submission | basic | ❌ | - |
| 이름 | User | - | ✅ 인쇄물제작 | 유지 |
| 연락처 | User | - | ✅ 인쇄물제작 | 유지 |
| 로고URL | Submission | logo | ❌ | 추가 고려 |
| 로고선호스타일 | Submission | logo | ✅ 로고제작 | 유지 |
| 로고선호색상 | Submission | logo | ✅ 로고제작 | 유지 |
| 로고선호폰트 | Submission | logo | ✅ 로고제작 | 유지 |
| 로고제작요청사항 | Submission | logo | ✅ 로고제작 | 유지 |
| 홈페이지컬러컨셉 | Submission | logo | ✅ 로고제작 | 유지 |
| 사업자등록증URL | Submission | **print** | ❌ | **추가 필요** |
| 프로필사진URL | Submission | **print** | ❌ | **추가 필요** |
| InstagramID | Submission | marketing | ✅ 계정정보 | 유지 |
| InstagramPW | Submission | marketing | ✅ 계정정보 | 유지 |
| 네이버검색광고ID | Submission | marketing | ✅ 계정정보 | 유지 |
| 네이버검색광고PW | Submission | marketing | ✅ 계정정보 | 유지 |
| 네이버클라우드ID | Submission | marketing | ❌ | - |
| 네이버클라우드PW | Submission | marketing | ❌ | - |
| MetaBusinessID | Submission | marketing | ❌ | - |
| MetaBusinessPW | Submission | marketing | ❌ | - |
| 아임웹ID | Submission | **website** | ⚠️ 계정정보 | **분리 필요** |
| 아임웹PW | Submission | **website** | ⚠️ 계정정보 | **분리 필요** |
| 아임웹관리자PW | Submission | website | ❌ | - |
| 홈페이지스타일 | Submission | website | ❌ | - |
| Gmail계정 | Submission | marketing | ❌ | - |
| Gmail앱비밀번호 | Submission | marketing | ❌ | - |

---

## 🔧 구현 우선순위

### ⚡ 긴급 (P0) - 즉시 배포

1. **인쇄물제작 href 수정**
   - `basic#business-files` → `print#business-files`
   - **파일**: `lib/submission-progress.ts` line 135
   - **결과**: 인쇄물제작 클릭 시 print 탭으로 정확히 이동

### 🔴 중요 (P1) - 1일 내 배포

2. **아임웹 계정 분리**
   - 계정정보 섹션에서 아임웹ID/PW 제거
   - **방법**: REQUIRED_FIELDS.계정정보 수정
   - **결과**: 계정정보 클릭 시 marketing 탭으로만 이동 (정확)

3. **website 탭에 ID 추가**
   - `<div id="website-section">`
   - **파일**: `app/dashboard/submission/page.tsx` line 1990
   - **결과**: 추후 홈페이지정보 섹션 추가 시 스크롤 가능

### 🟡 권장 (P2) - 1주 내 검토

4. **파일 업로드 진행률 추가**
   - 사업자등록증URL, 프로필사진URL을 인쇄물제작 섹션에 추가
   - **고려사항**: User 필드와 Submission 필드를 함께 추적하는 로직 필요
   - **결과**: 파일 업로드 여부를 진행률에 반영

5. **홈페이지정보 섹션 신규 추가**
   - 아임웹ID/PW/홈페이지스타일을 별도 섹션으로 분리
   - **결과**: 4개 진행률 섹션 (로고제작, 인쇄물제작, 계정정보, 홈페이지정보)

---

## ✅ 테스트 체크리스트

### 배포 전 필수 테스트

- [ ] "로고제작" 클릭 → logo 탭 이동 → `#logo-section`으로 스크롤
- [ ] "인쇄물제작" 클릭 → **print 탭** 이동 → `#business-files`로 스크롤 (사업자등록증 영역)
- [ ] "계정정보" 클릭 → marketing 탭 이동 → `#account-section`으로 스크롤
- [ ] 브라우저 콘솔에서 다음 로그 확인:
  - `Section data: 인쇄물제작 print#business-files`
  - `Progress bar clicked: { tab: 'print', elementId: 'business-files' }`
  - `Scrolling to element: business-files [object HTMLElement]`
- [ ] 모바일 반응형 테스트 (탭 전환 및 스크롤)

### 추가 검증

- [ ] 아임웹 계정 분리 후 계정정보 섹션의 완료율이 정확한지 확인
- [ ] 파일 업로드 시 진행률 변경 확인 (파일 추가한 경우)
- [ ] 페이지 새로고침 후 진행률 유지 확인

---

## 📝 변경 이력

| 날짜 | 작업 | 상태 |
|------|------|------|
| 2025-11-12 | 기획서 작성 | ✅ 완료 |
| 2025-11-12 | P0 긴급 수정 (href) | 🔄 대기 |
| - | P1 아임웹 분리 | 📅 예정 |
| - | P2 파일 진행률 추가 | 📅 예정 |

---

## 🎯 결론

**최소 변경으로 문제 해결:**
1. `lib/submission-progress.ts` line 135: `basic#business-files` → `print#business-files`
2. REQUIRED_FIELDS.계정정보에서 아임웹ID/PW 제거
3. `app/dashboard/submission/page.tsx` line 1990: `<div id="website-section">` 추가

이 3가지 수정만으로 클릭 네비게이션이 정상 작동하며, 추후 진행률 확장도 용이합니다.

**즉시 배포 가능**: P0 작업만 완료해도 사용자 경험이 크게 개선됩니다.
