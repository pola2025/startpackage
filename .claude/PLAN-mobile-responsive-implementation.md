# 구현 기획서: 모바일 반응형 최적화

**버전**: 1.0
**작성일**: 2025-12-09
**PRD 참조**: PRD-mobile-responsive-optimization.md

---

## 1. 구현 개요

### 1.1 작업 범위
- Phase 1 (P0): 대시보드 홈, 자료 제출, 제작 현황
- Phase 2 (P1): 시안 확인, 고객 지원
- Phase 3 (P2): 나머지 페이지

### 1.2 기술 스택
- Next.js 15 (App Router)
- Tailwind CSS (반응형)
- shadcn/ui (컴포넌트)
- Framer Motion (애니메이션, 선택)

---

## 2. Phase 1: 공통 컴포넌트 & 핵심 페이지

### 2.1 하단 탭 바 구현

**파일**: `components/ui/bottom-tab-bar.tsx`

```tsx
// 구현 항목
- 5개 탭: 홈, 자료제출, 제작현황, 시안확인, 더보기
- 현재 페이지 하이라이트
- 알림 뱃지 (시안확인에 미확인 개수)
- md: 이상에서 숨김
```

**레이아웃 변경**: `app/dashboard/layout.tsx`
```tsx
// 변경 사항
- 모바일: 사이드바 숨김, 하단 탭 바 표시
- 데스크탑: 기존 사이드바 유지
- 메인 컨텐츠 영역 패딩 조정 (하단 탭 바 높이만큼)
```

### 2.2 바텀시트 컴포넌트

**파일**: `components/ui/bottom-sheet.tsx`

```tsx
// 기능
- Sheet 컴포넌트 확장
- 모바일에서 하단에서 올라오는 형태
- 드래그로 닫기
- 배경 터치로 닫기
```

### 2.3 대시보드 홈 개선

**파일**: `app/dashboard/page.tsx`

#### 2.3.1 알림 영역 개선
```tsx
// 현재
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {alerts.map(alert => <AlertCard />)}
</div>

// 변경
<div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
  {/* 모바일: 스와이프 캐러셀 */}
  <div className="block md:hidden">
    <AlertCarousel alerts={alerts} />
  </div>
  {/* 데스크탑: 기존 그리드 */}
  <div className="hidden md:contents">
    {alerts.map(alert => <AlertCard />)}
  </div>
</div>
```

#### 2.3.2 내 정보 카드 개선
```tsx
// 현재: 2열 그리드
// 변경: 모바일 1열, 데스크탑 2열
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

#### 2.3.3 제작 진행 현황 개선
```tsx
// 현재: 가로 나열
// 변경: 모바일 세로 스택
<div className="flex flex-col md:flex-row gap-4">
```

#### 2.3.4 플로팅 액션 버튼
```tsx
// 모바일 전용: 자료 제출 바로가기
<div className="fixed bottom-20 right-4 md:hidden">
  <Button className="rounded-full w-14 h-14 shadow-lg">
    <Plus className="w-6 h-6" />
  </Button>
</div>
```

### 2.4 자료 제출 개선

**파일**: `app/dashboard/submission/page.tsx`

#### 2.4.1 탭 네비게이션 → 스텝 진행 바
```tsx
// 현재: 가로 탭
<Tabs>
  <TabsList>
    <TabsTrigger>기본정보</TabsTrigger>
    <TabsTrigger>로고정보</TabsTrigger>
    ...
  </TabsList>
</Tabs>

// 변경: 모바일 스텝 바
<div className="block md:hidden">
  <StepProgressBar
    steps={['기본', '로고', '명함', '홈페이지', '마케팅']}
    currentStep={activeTab}
  />
</div>
<div className="hidden md:block">
  <Tabs>...</Tabs>
</div>
```

#### 2.4.2 하단 고정 네비게이션
```tsx
// 모바일 전용: 하단 고정 버튼
<div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t md:hidden">
  <div className="flex gap-2">
    <Button variant="outline" onClick={prevStep}>이전</Button>
    <Button onClick={nextStep}>다음</Button>
  </div>
</div>
```

#### 2.4.3 폼 필드 스타일
```tsx
// 입력 필드 높이 증가
<Input className="h-12 text-base" />

// 레이블 스타일
<Label className="text-sm font-medium mb-2 block">필드명</Label>
```

#### 2.4.4 이미지 업로드 영역
```tsx
// 업로드 영역 확대
<div className="aspect-square md:aspect-video">
  <FileUpload />
</div>
```

### 2.5 제작 현황 개선

**파일**: `app/dashboard/workflows/page.tsx`

#### 2.5.1 제작 소요 기간 안내
```tsx
// 현재: 3열 그리드
// 변경: 모바일 가로 스크롤
<div className="overflow-x-auto md:overflow-visible">
  <div className="flex md:grid md:grid-cols-3 gap-4 min-w-max md:min-w-0">
    {periods.map(period => <PeriodCard />)}
  </div>
</div>
```

#### 2.5.2 워크플로우 카드 그리드
```tsx
// 현재: 3열 그리드
// 변경: 모바일 1열
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

#### 2.5.3 시안 확인 모달 → 바텀시트
```tsx
// 모바일에서 바텀시트로 변경
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <BottomSheet open={open} onOpenChange={setOpen}>
    <DesignPreview />
  </BottomSheet>
) : (
  <Dialog open={open} onOpenChange={setOpen}>
    <DesignPreview />
  </Dialog>
)}
```

#### 2.5.4 상태 필터
```tsx
// 모바일: 가로 스크롤 칩
<div className="overflow-x-auto">
  <div className="flex gap-2 min-w-max pb-2">
    {statuses.map(status => (
      <Badge
        key={status}
        variant={selected === status ? 'default' : 'outline'}
        className="cursor-pointer whitespace-nowrap"
      >
        {status}
      </Badge>
    ))}
  </div>
</div>
```

---

## 3. Phase 2: 시안 확인 & 고객 지원

### 3.1 시안 확인 개선

**파일**: `app/dashboard/design-threads/page.tsx`

#### 3.1.1 레이아웃 분리 (목록/상세)
```tsx
// 모바일: 목록과 상세를 분리된 뷰로
const [selectedThread, setSelectedThread] = useState(null);

// 모바일 뷰
<div className="md:hidden">
  {selectedThread ? (
    <ThreadDetail
      thread={selectedThread}
      onBack={() => setSelectedThread(null)}
    />
  ) : (
    <ThreadList
      threads={threads}
      onSelect={setSelectedThread}
    />
  )}
</div>

// 데스크탑 뷰 (기존)
<div className="hidden md:grid md:grid-cols-[350px_1fr]">
  <ThreadList />
  <ThreadDetail />
</div>
```

#### 3.1.2 메시지 입력 영역
```tsx
// 하단 고정, Safe Area 대응
<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t pb-safe">
  <div className="flex gap-2">
    <Button variant="ghost" size="icon">
      <ImagePlus />
    </Button>
    <Input
      className="flex-1 h-12"
      placeholder="메시지 입력..."
    />
    <Button>전송</Button>
  </div>
</div>
```

#### 3.1.3 이미지 첨부 바텀시트
```tsx
<BottomSheet>
  <div className="p-4">
    <h3>이미지 첨부</h3>
    <div className="grid grid-cols-3 gap-2 mt-4">
      <Button variant="outline">
        <Camera />
        카메라
      </Button>
      <Button variant="outline">
        <Image />
        갤러리
      </Button>
      <Button variant="outline">
        <File />
        파일
      </Button>
    </div>
  </div>
</BottomSheet>
```

### 3.2 고객 지원 개선

**파일**: `app/dashboard/communication/page.tsx`

- 시안 확인과 동일한 패턴 적용
- 카테고리 필터 → 상단 탭 바

---

## 4. Phase 3: 나머지 페이지

### 4.1 공지사항
- 카드 리스트 1열 정렬
- 상세 보기 모달 → 새 페이지 또는 바텀시트

### 4.2 가이드
- 아코디언 형식 유지
- 영상 임베드 반응형

### 4.3 콘텐츠 팁
- 카테고리 탭 → 가로 스크롤
- 카드 그리드 1열

### 4.4 홈페이지 정보
- 컬러 선택 그리드 조정
- 프리뷰 이미지 반응형

### 4.5 관리자 페이지 (최소 반응형)
- 테이블 → 가로 스크롤
- 필터 영역 축소
- 모달 크기 조정

---

## 5. 유틸리티 & 훅

### 5.1 useMediaQuery 훅
```tsx
// hooks/use-media-query.ts
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

### 5.2 Safe Area CSS
```css
/* globals.css */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pt-safe {
  padding-top: env(safe-area-inset-top, 0);
}
```

### 5.3 반응형 유틸리티 클래스
```css
/* 터치 타겟 */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* 모바일 전용 패딩 */
.mobile-padding {
  @apply px-4 md:px-6 lg:px-8;
}
```

---

## 6. 테스트 체크리스트

### 6.1 공통
- [ ] iPhone SE (375px)에서 깨지지 않음
- [ ] 가로 모드 지원
- [ ] 터치 타겟 44px 이상
- [ ] 폼 입력 시 키보드로 가려지지 않음
- [ ] 스크롤 성능 양호

### 6.2 페이지별
- [ ] 대시보드: 알림 캐러셀 스와이프
- [ ] 자료제출: 스텝 진행, 하단 버튼
- [ ] 제작현황: 카드 레이아웃, 시안 모달
- [ ] 시안확인: 목록/상세 전환
- [ ] 고객지원: 메시지 입력

---

## 7. 구현 순서

### Day 1-2: 공통 컴포넌트
1. `useMediaQuery` 훅 생성
2. `BottomSheet` 컴포넌트
3. `BottomTabBar` 컴포넌트
4. `dashboard/layout.tsx` 수정

### Day 3-4: 대시보드 홈
1. 알림 영역 개선
2. 내 정보/진행 현황 레이아웃
3. 플로팅 버튼

### Day 5-6: 자료 제출
1. 스텝 진행 바
2. 폼 필드 스타일
3. 하단 고정 버튼
4. 이미지 업로드 개선

### Day 7-8: 제작 현황
1. 카드 그리드 반응형
2. 시안 모달 → 바텀시트
3. 상태 필터 칩

### Day 9-10: 시안 확인 & 고객 지원
1. 목록/상세 분리 뷰
2. 메시지 입력 영역
3. 이미지 첨부 바텀시트

### Day 11-12: 나머지 페이지 & 테스트
1. 공지사항, 가이드 등
2. 전체 테스트
3. 버그 수정

---

## 8. 주의사항

### 8.1 기존 코드 유지
- `md:` 이상 클래스는 기존 유지
- 모바일 전용 스타일만 추가
- 데스크탑 테스트 병행

### 8.2 성능
- 조건부 렌더링보다 CSS 숨김 선호
- 큰 컴포넌트는 동적 임포트
- 이미지 최적화 (next/image)

### 8.3 접근성
- 터치 타겟 크기
- 색상 대비
- 포커스 표시

---

**문서 끝**
