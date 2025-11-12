/**
 * 자료 제출 진행률 계산 유틸리티
 */

export interface SubmissionData {
  // 로고 제작
  브랜드명: string | null;
  로고선호스타일: string | null;
  로고선호색상: string | null;
  로고선호폰트: string | null;
  로고제작요청사항: string | null;
  홈페이지컬러컨셉: string | null;

  // 인쇄물 제작
  주소: string | null;
  인쇄물받을주소: string | null;

  // 계정 정보
  아임웹ID: string | null;
  아임웹PW: string | null;
  InstagramID: string | null;
  InstagramPW: string | null;
  네이버검색광고ID: string | null;
  네이버검색광고PW: string | null;
}

export interface UserData {
  이름: string;
  연락처: string;
}

export interface ProgressSection {
  name: string;
  label: string;
  fields: string[];
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  href?: string; // 클릭 시 이동할 앵커 또는 URL
}

export interface ProgressResult {
  sections: ProgressSection[];
  totalCompleted: number;
  totalRequired: number;
  overallPercentage: number;
}

/**
 * 필수 항목 정의
 */
const REQUIRED_FIELDS = {
  로고제작: {
    label: "로고 제작 정보",
    fields: [
      "브랜드명",
      "로고선호스타일",
      "로고선호색상",
      "로고선호폰트",
      "로고제작요청사항",
      "홈페이지컬러컨셉",
    ],
  },
  인쇄물제작: {
    label: "인쇄물 제작 정보",
    fields: ["이름", "연락처", "주소"],
  },
  계정정보: {
    label: "계정 정보",
    fields: [
      "아임웹ID",
      "아임웹PW",
      "InstagramID",
      "InstagramPW",
      "네이버검색광고ID",
      "네이버검색광고PW",
    ],
  },
};

/**
 * 필드 값이 비어있는지 확인
 */
function isEmpty(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

/**
 * 자료 제출 진행률 계산
 */
export function calculateProgress(
  submission: SubmissionData,
  user: UserData
): ProgressResult {
  const sections: ProgressSection[] = [];

  // 로고 제작 섹션
  const logoFields = REQUIRED_FIELDS.로고제작.fields;
  const logoCompleted = logoFields.filter(
    (field) => !isEmpty(submission[field as keyof SubmissionData] as string)
  ).length;
  sections.push({
    name: "로고제작",
    label: REQUIRED_FIELDS.로고제작.label,
    fields: logoFields,
    completed: logoCompleted,
    total: logoFields.length,
    percentage: Math.round((logoCompleted / logoFields.length) * 100),
    isComplete: logoCompleted === logoFields.length,
    href: "logo#logo-section",
  });

  // 인쇄물 제작 섹션
  const printFields = REQUIRED_FIELDS.인쇄물제작.fields;
  let printCompleted = 0;

  // user 데이터 체크
  if (!isEmpty(user.이름)) printCompleted++;
  if (!isEmpty(user.연락처)) printCompleted++;

  // submission 데이터 체크 (주소 또는 인쇄물받을주소 중 하나만 있어도 됨)
  if (!isEmpty(submission.주소) || !isEmpty(submission.인쇄물받을주소)) {
    printCompleted++;
  }

  sections.push({
    name: "인쇄물제작",
    label: REQUIRED_FIELDS.인쇄물제작.label,
    fields: printFields,
    completed: printCompleted,
    total: printFields.length,
    percentage: Math.round((printCompleted / printFields.length) * 100),
    isComplete: printCompleted === printFields.length,
    href: "basic#business-files",
  });

  // 계정 정보 섹션
  const accountFields = REQUIRED_FIELDS.계정정보.fields;
  const accountCompleted = accountFields.filter(
    (field) => !isEmpty(submission[field as keyof SubmissionData] as string)
  ).length;
  sections.push({
    name: "계정정보",
    label: REQUIRED_FIELDS.계정정보.label,
    fields: accountFields,
    completed: accountCompleted,
    total: accountFields.length,
    percentage: Math.round((accountCompleted / accountFields.length) * 100),
    isComplete: accountCompleted === accountFields.length,
    href: "marketing#account-section",
  });

  // 전체 진행률
  const totalCompleted = sections.reduce((sum, s) => sum + s.completed, 0);
  const totalRequired = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPercentage = Math.round((totalCompleted / totalRequired) * 100);

  return {
    sections,
    totalCompleted,
    totalRequired,
    overallPercentage,
  };
}

/**
 * 필드 라벨 매핑 (한글 표시용)
 */
export const FIELD_LABELS: Record<string, string> = {
  브랜드명: "브랜드명",
  로고선호스타일: "로고 선호 스타일",
  로고선호색상: "로고 선호 색상",
  로고선호폰트: "로고 선호 폰트",
  로고제작요청사항: "로고 제작 요청사항",
  홈페이지컬러컨셉: "홈페이지 컬러 컨셉",
  이름: "이름",
  연락처: "연락처",
  주소: "주소",
  아임웹ID: "아임웹 ID",
  아임웹PW: "아임웹 PW",
  InstagramID: "인스타그램 ID",
  InstagramPW: "인스타그램 PW",
  네이버검색광고ID: "네이버 검색광고 ID",
  네이버검색광고PW: "네이버 검색광고 PW",
};
