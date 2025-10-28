# 콘텐츠 제작 Tip 시스템 구현 계획

## 📋 프로젝트 개요

**목적**: 관리자가 유튜브/블로그 링크를 업로드하고, 수강생과 수료생이 열람할 수 있는 콘텐츠 제작 Tip 시스템

**주요 기능**:
- 관리자: 콘텐츠 팁 생성/수정/삭제
- 수강생/수료생: 16:9 카드 그리드 → 모달 → 새 창으로 이동
- 이메일 알림: 기본 OFF, 설정에서 ON 가능

---

## ✅ 완료된 작업

### 1. DB 스키마 (완료)
- ✅ `ContentTip` 모델 추가
  - id, authorId, authorName
  - title, description
  - linkType (youtube/blog), linkUrl
  - thumbnailUrl (선택)
  - published, createdAt, updatedAt
- ✅ `User` 모델에 `콘텐츠팁이메일수신` 필드 추가 (기본값: false)
- ✅ Prisma DB Push 완료

### 2. 공용 API (완료)
**파일**:
- `F:\startpackage\app\api\content-tips\route.ts` (수강생용)
- `F:\startpackage-alumni\app\api\content-tips\route.ts` (수료생용)

**엔드포인트**:
- `GET /api/content-tips` - 발행된 콘텐츠 팁 목록 조회

### 3. 관리자 API (완료)
**파일**:
- `F:\startpackage\app\api\(admin)\admin\content-tips\route.ts`
- `F:\startpackage\app\api\(admin)\admin\content-tips\[id]\route.ts`

**엔드포인트**:
- `GET /api/admin/content-tips` - 모든 콘텐츠 팁 조회 (발행/미발행 포함)
- `POST /api/admin/content-tips` - 새 콘텐츠 팁 생성 + 이메일 알림
- `GET /api/admin/content-tips/[id]` - 개별 조회
- `PATCH /api/admin/content-tips/[id]` - 수정
- `DELETE /api/admin/content-tips/[id]` - 삭제

---

## 🚧 진행 중 작업

### 4. 관리자 페이지 (진행 예정)
**파일**: `F:\startpackage\app\admin\(dashboard)\content-tips\page.tsx`

**기능**:
- 콘텐츠 팁 목록 (테이블)
- 새 콘텐츠 팁 작성 (다이얼로그)
- 수정/삭제 기능
- 발행/미발행 토글

**UI 구성**:
```
[제목] [설명] [링크타입] [링크] [썸네일] [발행상태] [작업]
```

---

## 📝 남은 작업

### 5. 수강생 페이지 (대기)
**파일**: `F:\startpackage\app\(user)\content-tips\page.tsx`

**UI 구조**:
1. **그리드 레이아웃**: 16:9 비율 카드
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     <Card className="aspect-video">
       <img src={thumbnailUrl} alt={title} />
       <h3>{title}</h3>
       <p className="line-clamp-2">{description}</p>
     </Card>
   </div>
   ```

2. **1차 클릭**: 모달 팝업
   ```tsx
   <Dialog>
     <h2>{title}</h2>
     <p>{description}</p>
     {linkType === "youtube" && <YouTubeEmbed url={linkUrl} />}
     <Button onClick={() => window.open(linkUrl, "_blank")}>
       전체화면으로 보기
     </Button>
   </Dialog>
   ```

3. **2차 클릭**: 새 창 이동 (`window.open(linkUrl, "_blank")`)

### 6. 수료생 페이지 (대기)
**파일**: `F:\startpackage-alumni\app\content-tips\page.tsx`

**기능**: 수강생 페이지와 동일

### 7. 사용자 설정 API 수정 (대기)
**파일**:
- `F:\startpackage\app\api\user\settings\route.ts`
- `F:\startpackage-alumni\app\api\user\settings\route.ts`

**추가 작업**:
- `콘텐츠팁이메일수신` 필드 처리 추가

### 8. 이메일 알림 기능 (대기)
**파일**: `F:\startpackage\lib\notification\contentTipEmail.ts` (생성 필요)

**기능**:
- 새 콘텐츠 팁 발행 시 `콘텐츠팁이메일수신 = true`인 사용자에게 이메일 발송
- 제목: "[비즈액터스쿨] 새로운 콘텐츠 제작 Tip이 등록되었습니다"
- 내용: 제목, 설명, 링크 버튼

**참고 파일**:
- `F:\startpackage\lib\notification\announcementEmail.ts` (마케팅 소식 이메일)

### 9. 네비게이션 추가 (대기)
**수정 필요**:
- 수강생 대시보드 서비스 카드 추가
- 수료생 헤더 네비게이션 추가
- 관리자 사이드바 메뉴 추가

---

## 🎯 다음 단계

### Step 1: 관리자 페이지 생성
1. 콘텐츠 팁 목록 조회
2. 새 콘텐츠 팁 작성 폼
3. 수정/삭제 기능
4. 테스트

### Step 2: 수강생/수료생 페이지 생성
1. 16:9 카드 그리드 레이아웃
2. 모달 다이얼로그
3. 새 창 열기 기능
4. 유튜브 임베드 처리
5. 테스트

### Step 3: 이메일 알림 구현
1. 이메일 템플릿 작성
2. 발송 함수 구현
3. API 연동
4. 테스트

### Step 4: 사용자 설정 연동
1. 설정 API 수정
2. 설정 페이지 UI 수정
3. 테스트

### Step 5: 최종 테스트 및 배포
1. 전체 기능 테스트
2. 프로덕션 배포
3. 모니터링

---

## 📌 주의사항

1. **이메일 수신 기본값**: `false` (사용자가 직접 켜야 함)
2. **유튜브 URL 파싱**: `youtube.com/watch?v=` 또는 `youtu.be/` 형식 지원
3. **16:9 비율**: `aspect-video` 또는 `pb-[56.25%]` 사용
4. **모달 → 새 창**: 2단계 클릭 구조
5. **썸네일 처리**:
   - 유튜브: `https://img.youtube.com/vi/{videoId}/maxresdefault.jpg`
   - 블로그: 관리자가 직접 업로드 또는 URL 입력

---

## 📚 참고 파일

**마케팅 소식 (Announcements) 참고**:
- API: `F:\startpackage\app\api\(admin)\admin\announcements\route.ts`
- 관리자 페이지: `F:\startpackage\app\admin\(dashboard)\announcements\page.tsx`
- 수료생 페이지: `F:\startpackage-alumni\app\announcements\page.tsx`
- 이메일: `F:\startpackage\lib\notification\announcementEmail.ts`

**사용자 설정**:
- API: `F:\startpackage\app\api\user\settings\route.ts`
- 수료생 API: `F:\startpackage-alumni\app\api\user\settings\route.ts`

---

**문서 작성일**: 2025-10-28
**작성자**: Claude Code
**상태**: 진행 중 (Step 1 준비)
