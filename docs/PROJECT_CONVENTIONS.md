# 프로젝트 컨벤션 아카이브

> 혼선 방지용 네이밍 / 역할 / API 패턴 레퍼런스
> 최종 업데이트: 2026-02-26

---

## 1. 관리자 역할(Role) 정의

| role 값       | 설명              | 접근 범위              |
| ------------- | ----------------- | ---------------------- |
| `super`       | 슈퍼 관리자       | 모든 기능              |
| `designer`    | 디자이너 관리자   | 디자인 관련 기능       |
| `operator`    | 운영 관리자       | 사용자/워크플로우 관리 |
| _(일반 유저)_ | role 없음 or null | 대시보드만             |

> ⚠️ `"admin"` 이라는 role 값은 **존재하지 않는다**. 과거 일부 코드에 잘못 쓰였으나 수정됨.

### 올바른 권한 체크 패턴

**서버 컴포넌트 (page.tsx):**

```typescript
const session = await auth();
const userRole = (session?.user as any)?.role;
if (!session || !["super", "designer", "operator"].includes(userRole)) {
  redirect("/admin/login");
}
```

**API Route (route.ts):**

```typescript
const session = await auth();
const userRole = (session?.user as any)?.role;
if (!session || !["super", "designer", "operator"].includes(userRole)) {
  return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
}
```

---

## 2. API 엔드포인트 네이밍

### 관리자 API: `/api/admin/...`

| 경로                               | 메서드       | 설명                  |
| ---------------------------------- | ------------ | --------------------- |
| `/api/admin/users`                 | GET          | 사용자 목록           |
| `/api/admin/users/[id]/submission` | PATCH        | 유저 제출정보 수정    |
| `/api/admin/cohorts/create`        | POST         | 기수 생성             |
| `/api/admin/cohorts/update`        | POST         | 기수 수정             |
| `/api/admin/cohorts/toggle`        | POST         | 기수 활성화 토글      |
| `/api/admin/alerts`                | GET/POST     | 팝업 목록 조회 / 생성 |
| `/api/admin/alerts/[id]`           | PATCH/DELETE | 팝업 수정 / 삭제      |
| `/api/admin/announcements`         | GET/POST     | 마케팅 소식           |
| `/api/admin/workflows/create`      | POST         | 워크플로우 생성       |
| `/api/admin/workflows/update`      | POST         | 워크플로우 업데이트   |

### 일반 유저 API: `/api/...`

| 경로                       | 메서드         | 설명                       |
| -------------------------- | -------------- | -------------------------- |
| `/api/submission`          | GET/POST/PATCH | 제출 정보                  |
| `/api/submission/autosave` | POST           | 자동저장                   |
| `/api/homepage`            | GET/POST       | 홈페이지 제작 정보         |
| `/api/alerts/active`       | GET            | 활성 팝업 조회 (기수 필터) |
| `/api/upload`              | POST           | 이미지 업로드              |
| `/api/user/settings`       | PATCH          | 수신동의 변경              |
| `/api/update-phone`        | POST           | 연락처 변경                |

> 패턴: 복수형 명사 → 컬렉션 (GET 목록 / POST 생성), `/[id]` → 단건 (PATCH 수정 / DELETE 삭제)

---

## 3. 주요 Prisma 모델 & 네이밍

| 모델명           | 테이블명        | 설명                   |
| ---------------- | --------------- | ---------------------- |
| `User`           | `users`         | 일반 유저              |
| `Submission`     | (기본)          | 제출 정보 (User와 1:1) |
| `Cohort`         | (기본)          | 기수                   |
| `Workflow`       | (기본)          | 워크플로우             |
| `SystemAlert`    | `system_alerts` | 팝업/알림              |
| `AlertDismissal` | (기본)          | 팝업 숨김 기록         |
| `DesignThread`   | (기본)          | 시안 스레드            |
| `AdAutomation`   | (기본)          | 광고 자동화            |

### SystemAlert 주요 필드

```
cohortId: String?   // null = 전체 공개, 값 있으면 해당 기수만
isActive: Boolean   // false면 노출 안 됨
startDate/endDate   // 게재 기간
type: "info" | "warning" | "urgent"
```

---

## 4. 컴포넌트 네이밍 패턴

| 패턴                                  | 예시               | 용도                     |
| ------------------------------------- | ------------------ | ------------------------ |
| `[Feature]Page`                       | `CohortsPage`      | 서버 컴포넌트 (page.tsx) |
| `[Feature]Client`                     | `AlertsClient`     | 클라이언트 컴포넌트      |
| `[Feature]Actions`                    | `WorkflowActions`  | 액션 버튼 모음           |
| `[Feature]Dialog`                     | `EditCohortDialog` | 다이얼로그               |
| `Add[Feature]Button`                  | `AddCohortButton`  | 추가 버튼                |
| `[Feature]List` / `[Feature]s-client` | `CohortsList`      | 목록 컴포넌트            |

---

## 5. 환경변수 키 목록

| 변수                   | 설명              |
| ---------------------- | ----------------- |
| `DATABASE_URL`         | PostgreSQL (Neon) |
| `NEXTAUTH_SECRET`      | NextAuth 시크릿   |
| `SLACK_BOT_TOKEN`      | 슬랙 봇 토큰      |
| `TELEGRAM_BOT_TOKEN`   | 텔레그램 봇 토큰  |
| `R2_ACCESS_KEY_ID`     | Cloudflare R2     |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2     |
| `R2_BUCKET_NAME`       | R2 버킷명         |
| `R2_PUBLIC_URL`        | R2 공개 URL       |
| `GOOGLE_CLIENT_ID`     | Gmail OAuth2      |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth2      |
| `GOOGLE_REFRESH_TOKEN` | Gmail OAuth2      |

---

## 6. 관리자 페이지 라우트

| URL                     | 파일                      | 설명               |
| ----------------------- | ------------------------- | ------------------ |
| `/admin`                | `page.tsx`                | 대시보드           |
| `/admin/users`          | `users/page.tsx`          | 사용자 관리        |
| `/admin/workflows`      | `workflows/page.tsx`      | 워크플로우         |
| `/admin/notifications`  | `notifications/page.tsx`  | 알림 이력          |
| `/admin/alerts`         | `alerts/page.tsx`         | 팝업 관리 ← NEW    |
| `/admin/cohorts`        | `cohorts/page.tsx`        | 기수 관리          |
| `/admin/admins`         | `admins/page.tsx`         | 관리자 관리        |
| `/admin/requests`       | `requests/page.tsx`       | 가입 신청          |
| `/admin/communication`  | `communication/page.tsx`  | 커뮤니케이션       |
| `/admin/design-threads` | `design-threads/page.tsx` | 시안 관리          |
| `/admin/ad-automation`  | `ad-automation/page.tsx`  | 광고 자동화        |
| `/admin/homepage`       | `homepage/page.tsx`       | 홈페이지 제출 현황 |
| `/admin/announcements`  | `announcements/page.tsx`  | 마케팅 소식        |
| `/admin/content-tips`   | `content-tips/page.tsx`   | 콘텐츠 Tip         |
