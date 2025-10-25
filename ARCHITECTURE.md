# 스타트패키지 시스템 아키텍처

## 프로젝트 개요

**프로젝트명**: 비즈액터스쿨 스타트패키지 자료제출 및 피드백 관리 시스템
**목적**: 교육생이 인쇄물/마케팅/홈페이지 제작에 필요한 자료를 제출하고, 제작 진행 상황을 실시간으로 확인할 수 있는 플랫폼

## 1. 시스템 구조 개요

### 1.1 핵심 서비스 영역
```
┌─────────────────────────────────────────────────┐
│         스타트패키지 통합 관리 시스템             │
├─────────────────────────────────────────────────┤
│  1. 인쇄물 제작 서비스                           │
│     - 명찰, 명함, 자문계약서, 대봉투              │
│  2. 마케팅 서비스                                │
│     - 메타광고, 네이버광고, 네이버클라우드, 블로그│
│  3. 홈페이지 제작 서비스                         │
│     - 아임웹 기반 홈페이지 제작                   │
└─────────────────────────────────────────────────┘
```

### 1.2 사용자 플로우
```
입장 → 인증 → 자료제출 → 제작진행 → 시안확인 → 발주요청 → 제작완료
  ↓      ↓       ↓         ↓         ↓         ↓         ↓
 기수   비밀번호  업로드    상태변경   검수     최종확인   발송추적
```

## 2. 인증 시스템

### 2.1 인증 프로세스
```javascript
// Step 1: 기수 선택
- 활성화된 기수만 표시 (예: 19기 목, 19기 금)
- 관리자가 활성화 설정 가능

// Step 2: 기본 정보 입력
{
  기수: "19기 목",
  이름: "홍길동",
  연락처: "010-1234-5678"
}

// Step 3: 비밀번호 설정
{
  비밀번호: "1234" // 4자리 숫자
}

// Step 4: 인증 완료
→ 세션 생성
→ 자료제출 화면 진입
```

### 2.2 보안 요구사항
- 비밀번호: 4자리 숫자 (간단하지만 본인확인 가능)
- 세션 유지: 로컬스토리지 + 서버 세션
- 재로그인: 기수 + 이름 + 연락처 + 비밀번호

## 3. 데이터베이스 스키마

### 3.1 Users (교육생)
```typescript
interface User {
  id: string;
  기수: string;              // "19기 목"
  이름: string;
  연락처: string;
  비밀번호: string;          // 해시 처리
  createdAt: Date;
  updatedAt: Date;

  // 기본 정보
  브랜드명?: string;
  이메일주소?: string;
  대표번호?: string;
  계좌번호?: string;
}
```

### 3.2 Submissions (자료 제출)
```typescript
interface Submission {
  id: string;
  userId: string;

  // 인쇄물 관련
  사업자등록증?: {
    fileUrl: string;
    uploadedAt: Date;
  };

  프로필사진?: {
    fileUrl: string;
    uploadedAt: Date;
    validation: "1000px 이하 체크";
  };

  인쇄물주소?: {
    사업장소재지사용: boolean;
    별도주소?: string;
  };

  // 마케팅 관련
  메타광고관리자?: {
    type: "초대" | "ID/PW" | "이메일";
    value: string;
  };

  네이버검색광고?: {
    id: string;
    password: string;
    본인인증완료: boolean;
    예산충전: "1-3만원";
  };

  네이버클라우드?: {
    id: string;
    password: string;
    결제정보등록: boolean;
  };

  블로그디자인?: {
    요청사항: string;
  };

  // 홈페이지 관련
  홈페이지스타일?: {
    선택스타일?: string;
    컬러컨셉: string; // 필수
  };

  // 메타데이터
  제출완료: boolean;
  최종제출일?: Date;
}
```

### 3.3 ProductionStatus (제작 상태)
```typescript
interface ProductionStatus {
  id: string;
  userId: string;

  상태: "자료제출중" | "제작진행중" | "시안확인" | "발주요청" | "제작완료";

  // 인쇄물별 상태
  명찰: PrintItemStatus;
  명함: PrintItemStatus;
  자문계약서: PrintItemStatus;
  대봉투: PrintItemStatus;

  // 제작 일정
  예상완료일?: {
    명함: Date;      // 2-3일
    대봉투: Date;    // 4-5일
    자문계약서: Date; // 7일
    명찰: Date;      // 3-4일
  };

  // 상태 변경 이력
  statusHistory: StatusChange[];
}

interface PrintItemStatus {
  상태: "대기" | "디자인중" | "시안완료" | "발주완료" | "제작완료" | "발송완료";
  시안URL?: string;
  발주일?: Date;
  완료일?: Date;
  수정횟수: number; // 최대 2회
}

interface StatusChange {
  from: string;
  to: string;
  timestamp: Date;
  reason?: string;
}
```

### 3.4 Cohorts (기수 관리)
```typescript
interface Cohort {
  id: string;
  name: string;        // "19기 목"
  isActive: boolean;   // 활성화 여부
  startDate: Date;
  endDate?: Date;
}
```

## 4. 상태 관리 플로우

### 4.1 상태 전환 규칙
```
[자료제출중]
  ↓ (모든 필수 자료 업로드 완료)
[제작진행중] ← 수정/업로드 불가
  ↓ (관리자가 시안 업로드)
[시안확인]
  ↓ (사용자가 발주요청 버튼 클릭)
[발주요청] ← 정보 변경 불가 (경고 강조!)
  ↓ (인쇄소 제작 완료)
[제작완료]
  ↓ (발송)
[발송완료]
```

### 4.2 상태별 권한 제어
```typescript
const statePermissions = {
  자료제출중: {
    수정가능: true,
    업로드가능: true,
    상태변경: "자동" // 모든 자료 제출 시
  },

  제작진행중: {
    수정가능: false,
    업로드가능: false,
    메시지: "디자인 시안이 영업일 기준 1~2일 내 전달될 예정입니다."
  },

  시안확인: {
    수정가능: false,
    발주가능: true,
    경고: "발주 후 오탈자 발견 시 재발주 비용 본인 부담"
  },

  발주요청: {
    수정가능: false,
    업로드가능: false,
    정보변경불가: true,
    강력경고: "발주 완료! 정보 변경 불가!"
  }
};
```

### 4.3 필수 자료 검증 로직
```typescript
function validateSubmission(submission: Submission): {
  isComplete: boolean;
  missing: string[];
} {
  const required = [
    "브랜드명",
    "이메일주소",
    "대표번호",
    "연락처",
    "계좌번호",
    "사업자등록증",
    "프로필사진"
  ];

  const missing = required.filter(field => !submission[field]);

  return {
    isComplete: missing.length === 0,
    missing
  };
}
```

## 5. UI/UX 구조

### 5.1 화면 구성
```
1. 인증 화면
   - 기수 선택
   - 이름/연락처 입력
   - 비밀번호 설정

2. 대시보드
   ┌─────────────────────────────────────┐
   │  [진행 상태 표시]                    │
   │  ● 자료제출중 / 제작진행중 / ...     │
   ├─────────────────────────────────────┤
   │  [필수 자료 제출 현황]               │
   │  ✅ 브랜드명                         │
   │  ✅ 이메일주소                       │
   │  ❌ 프로필사진 (미제출 - 강조!)      │
   │  ❌ 사업자등록증 (미제출 - 강조!)    │
   ├─────────────────────────────────────┤
   │  [서비스별 탭]                       │
   │  📄 인쇄물 │ 📱 마케팅 │ 🌐 홈페이지│
   └─────────────────────────────────────┘

3. 인쇄물 탭
   - 기본 정보 입력 폼
   - 파일 업로드 영역
   - 시안 확인 영역 (상태에 따라 표시)
   - 발주 요청 버튼 (주의사항 강조)

4. 마케팅 탭
   - 메타광고 관리자 설정
   - 네이버 광고 ID/PW
   - 네이버 클라우드 ID/PW
   - 블로그 디자인 요청

5. 홈페이지 탭
   - 스타일 선택 (샘플 사이트 미리보기)
   - 컬러 컨셉 선택 (필수)
   - 아임웹 계정 정보

6. 안내사항 페이지
   - 제작 가이드
   - 주의사항
   - FAQ
```

### 5.2 디자인 컨셉

#### 감각적이고 몰입도 있는 디자인
```css
/* 컬러 팔레트 (예시) */
:root {
  --primary: #1a1a2e;      /* 다크 네이비 */
  --accent: #0f3460;       /* 딥 블루 */
  --highlight: #16213e;    /* 미드나잇 블루 */
  --success: #00ff88;      /* 네온 그린 */
  --warning: #ff6b6b;      /* 코랄 레드 */
  --text: #eee;            /* 라이트 그레이 */
}

/* 글래스모피즘 효과 */
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 입력 미완료 강조 */
.incomplete {
  animation: pulse 2s infinite;
  border: 2px solid var(--warning);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
}

/* 버튼 호버 효과 */
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
}
```

#### 주의사항 강조 디자인
```html
<!-- 발주 요청 전 경고 -->
<div class="warning-box critical">
  <div class="warning-icon">⚠️</div>
  <h3>발주 전 필독!</h3>
  <ul>
    <li>발주 후 정보 변경 불가</li>
    <li>오탈자 미검수로 인한 재발주 비용은 본인 부담</li>
    <li>디자인 수정은 최대 2회까지만 가능</li>
    <li>3회 이상 수정 시 건당 1만원 추가 비용 발생</li>
  </ul>
  <label class="checkbox-confirm">
    <input type="checkbox" required />
    위 내용을 모두 확인했으며 동의합니다
  </label>
</div>
```

### 5.3 시각적 구분 전략

#### 입력 완료 vs 미완료
```
✅ [완료] 밝은 배경, 체크 아이콘, 안정적인 색상
❌ [미완료] 펄스 애니메이션, 경고 색상, 강조 테두리
```

#### 상태별 컬러 코딩
```
자료제출중:   🟡 노란색 (작업 필요)
제작진행중:   🔵 파란색 (진행 중)
시안확인:     🟣 보라색 (확인 필요)
발주요청:     🟠 오렌지 (검수 필수!)
제작완료:     🟢 초록색 (완료)
```

## 6. 제작 일정 자동 계산

### 6.1 영업일 계산 로직
```typescript
function calculateBusinessDays(
  startDate: Date,
  daysToAdd: number
): Date {
  let currentDate = new Date(startDate);
  let addedDays = 0;

  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);

    // 주말 제외
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      // 공휴일 체크 (별도 공휴일 DB 필요)
      if (!isHoliday(currentDate)) {
        addedDays++;
      }
    }
  }

  return currentDate;
}

// 인쇄물별 예상 완료일
function calculateExpectedDates(발주일: Date) {
  return {
    명함: {
      최소: calculateBusinessDays(발주일, 2),
      최대: calculateBusinessDays(발주일, 3)
    },
    대봉투: {
      최소: calculateBusinessDays(발주일, 4),
      최대: calculateBusinessDays(발주일, 5)
    },
    자문계약서: {
      최소: calculateBusinessDays(발주일, 7),
      최대: calculateBusinessDays(발주일, 7)
    },
    명찰: {
      최소: calculateBusinessDays(발주일, 3),
      최대: calculateBusinessDays(발주일, 4)
    }
  };
}
```

### 6.2 예외 상황 안내
```typescript
const specialPeriods = [
  {
    period: "연말/연시 (12/20 ~ 1/10)",
    delay: "+2~3일",
    message: "연말연시 기간으로 제작 지연 가능"
  },
  {
    period: "선거 전후 (선거일 ±2주)",
    delay: "+3~5일",
    message: "선거 인쇄물 집중으로 제작 지연 가능"
  },
  {
    period: "연휴 직전",
    delay: "+1~2일",
    message: "연휴 전 주문 집중으로 제작 지연 가능"
  }
];
```

## 7. 파일 업로드 시스템

### 7.1 파일 검증
```typescript
// 프로필 사진 검증
function validateProfileImage(file: File): ValidationResult {
  const img = new Image();
  img.src = URL.createObjectURL(file);

  return new Promise((resolve) => {
    img.onload = () => {
      if (img.width > 1000 || img.height > 1000) {
        resolve({
          valid: false,
          error: "이미지는 1000px 이하여야 합니다"
        });
      } else {
        resolve({ valid: true });
      }
    };
  });
}

// 사업자등록증 검증
function validateBusinessFile(file: File): ValidationResult {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "JPG, PNG, PDF 파일만 가능합니다" };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "파일 크기는 10MB 이하여야 합니다" };
  }

  return { valid: true };
}
```

### 7.2 스토리지 구조
```
/uploads
  /{userId}
    /profile
      - profile_원본파일명.jpg
    /documents
      - business_license.pdf
      - id_card.jpg
      - telecom_certificate.pdf
      - credit_card.jpg
    /designs
      /명함
        - draft_v1.pdf
        - draft_v2.pdf
        - final.pdf
      /명찰
        - draft_v1.pdf
        - final.pdf
      /자문계약서
        - draft_v1.pdf
        - final.pdf
      /대봉투
        - draft_v1.pdf
        - final.pdf
```

## 8. 관리자 기능

### 8.1 관리자 대시보드
```
1. 기수 관리
   - 활성화/비활성화
   - 교육생 목록

2. 제작 관리
   - 자료 제출 현황
   - 시안 업로드
   - 상태 변경

3. 통계
   - 제출 완료율
   - 평균 제작 기간
   - 서비스별 이용 현황
```

### 8.2 시안 업로드 프로세스
```typescript
// 관리자가 시안 업로드
async function uploadDesignDraft(
  userId: string,
  itemType: "명함" | "명찰" | "자문계약서" | "대봉투",
  file: File
) {
  // 1. 파일 업로드
  const url = await uploadFile(file, `${userId}/designs/${itemType}/`);

  // 2. DB 업데이트
  await updateProductionStatus(userId, {
    [itemType]: {
      상태: "시안완료",
      시안URL: url
    }
  });

  // 3. 사용자 상태 변경
  await updateUserStatus(userId, "시안확인");

  // 4. 알림 발송 (선택)
  await sendNotification(userId, "시안이 업로드되었습니다");
}
```

## 9. 알림 시스템 (선택 사항)

### 9.1 알림 채널
```
- SMS (NCP SENS)
- 이메일
- 텔레그램 (관리자용)
```

### 9.2 알림 트리거
```typescript
const notifications = {
  자료제출완료: {
    to: "관리자",
    message: "[{이름}] 님이 자료 제출을 완료했습니다"
  },

  시안업로드: {
    to: "사용자",
    message: "디자인 시안이 완료되었습니다. 확인 후 발주 요청해주세요"
  },

  발주완료: {
    to: "관리자 + 사용자",
    message: "발주가 완료되었습니다. 예상 완료일: {날짜}"
  },

  제작완료: {
    to: "사용자",
    message: "인쇄물 제작이 완료되었습니다"
  }
};
```

## 10. 기술 스택 제안

### 10.1 Frontend
```
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (감각적인 디자인)
- Framer Motion (애니메이션)
- React Hook Form (폼 관리)
- Zustand (상태 관리)
```

### 10.2 Backend
```
- Next.js API Routes (서버리스)
- Prisma (ORM)
- PostgreSQL or MongoDB
- NextAuth (인증)
```

### 10.3 Storage
```
- AWS S3 or Cloudflare R2 (파일 저장)
- Vercel (호스팅)
```

### 10.4 외부 서비스
```
- NCP SENS (SMS)
- SendGrid (이메일)
- Telegram Bot API (관리자 알림)
```

## 11. 보안 및 개인정보 보호

### 11.1 개인정보 처리
```
- 최소 수집 원칙
- 암호화 저장 (비밀번호, 민감 정보)
- 제출 기한 이후 자동 삭제 옵션
```

### 11.2 파일 보안
```
- 서명된 URL (S3 Presigned URL)
- 접근 권한 검증
- 바이러스 스캔 (선택)
```

## 12. 확장성 고려사항

### 12.1 향후 추가 기능
```
- [ ] 제작 진행률 시각화 (프로그레스 바)
- [ ] 채팅 기능 (관리자 ↔ 사용자)
- [ ] 모바일 앱 (React Native)
- [ ] 자동 리마인더 (자료 미제출 알림)
- [ ] 결제 시스템 (추가 옵션)
```

### 12.2 성능 최적화
```
- 이미지 최적화 (Next.js Image)
- CDN 활용
- 페이지 단위 캐싱
- SSR + ISR 하이브리드
```

---

## 다음 단계

1. ✅ 전체 구조 설계 완료
2. ⬜ 데이터베이스 스키마 상세 설계
3. ⬜ 화면 와이어프레임 작성
4. ⬜ 프로토타입 개발
5. ⬜ 사용자 테스트

**작성일**: 2025-10-23
**작성자**: Claude (AI Assistant)
**프로젝트**: 비즈액터스쿨 스타트패키지
