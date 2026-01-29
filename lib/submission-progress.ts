/**
 * 자료 제출 진행률 계산 유틸리티 v2
 * 7개 섹션: 브랜드정보, 사업자등록증, 프로필사진, 명함스타일, 로고, 홈페이지, 마케팅
 */

export interface SubmissionData {
  // 기본 정보
  브랜드명: string | null;

  // 인쇄물
  사업자등록증URL: string | null;
  프로필사진URL: string | null;
  명함시안: string | null;
  명함색상: string | null;

  // 로고
  로고선호스타일: string | null;
  로고선호색상: string | null;
  로고선호폰트: string | null;
  로고제작요청사항: string | null;

  // 홈페이지
  홈페이지컬러컨셉: string | null;
  홈페이지스타일: string | null;

  // 마케팅
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
  href?: string;
}

export interface ProgressResult {
  sections: ProgressSection[];
  totalCompleted: number;
  totalRequired: number;
  overallPercentage: number;
  nextAction?: NextActionHint;
}

export interface NextActionHint {
  section: string;
  sectionLabel: string;
  message: string;
  href: string;
}

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

  // 1. 브랜드정보
  const brandCompleted = !isEmpty(submission.브랜드명) ? 1 : 0;
  sections.push({
    name: "브랜드정보",
    label: "브랜드정보",
    fields: ["브랜드명"],
    completed: brandCompleted,
    total: 1,
    percentage: brandCompleted * 100,
    isComplete: brandCompleted === 1,
    href: "basic#brand-section",
  });

  // 2. 사업자등록증
  const licenseCompleted = !isEmpty(submission.사업자등록증URL) ? 1 : 0;
  sections.push({
    name: "사업자등록증",
    label: "사업자등록증",
    fields: ["사업자등록증URL"],
    completed: licenseCompleted,
    total: 1,
    percentage: licenseCompleted * 100,
    isComplete: licenseCompleted === 1,
    href: "print#business-license-section",
  });

  // 3. 프로필사진
  const profileCompleted = !isEmpty(submission.프로필사진URL) ? 1 : 0;
  sections.push({
    name: "프로필사진",
    label: "프로필사진",
    fields: ["프로필사진URL"],
    completed: profileCompleted,
    total: 1,
    percentage: profileCompleted * 100,
    isComplete: profileCompleted === 1,
    href: "print#profile-photo-section",
  });

  // 4. 명함스타일 (명함시안 OR 명함색상)
  const namecardCompleted =
    (!isEmpty(submission.명함시안) || !isEmpty(submission.명함색상)) ? 1 : 0;
  sections.push({
    name: "명함스타일",
    label: "명함스타일",
    fields: ["명함시안", "명함색상"],
    completed: namecardCompleted,
    total: 1,
    percentage: namecardCompleted * 100,
    isComplete: namecardCompleted === 1,
    href: "print#namecard-section",
  });

  // 5. 로고
  const logoFields = [
    "로고선호스타일",
    "로고선호색상",
    "로고선호폰트",
    "로고제작요청사항",
  ];
  const logoCompleted = logoFields.filter(
    (field) => !isEmpty(submission[field as keyof SubmissionData] as string)
  ).length;
  sections.push({
    name: "로고",
    label: "로고",
    fields: logoFields,
    completed: logoCompleted,
    total: logoFields.length,
    percentage: Math.round((logoCompleted / logoFields.length) * 100),
    isComplete: logoCompleted === logoFields.length,
    href: "logo#logo-section",
  });

  // 6. 홈페이지
  const homepageFields = ["홈페이지컬러컨셉", "홈페이지스타일"];
  const homepageCompleted = homepageFields.filter(
    (field) => !isEmpty(submission[field as keyof SubmissionData] as string)
  ).length;
  sections.push({
    name: "홈페이지",
    label: "홈페이지",
    fields: homepageFields,
    completed: homepageCompleted,
    total: homepageFields.length,
    percentage: Math.round((homepageCompleted / homepageFields.length) * 100),
    isComplete: homepageCompleted === homepageFields.length,
    href: "website#homepage-section",
  });

  // 7. 마케팅
  const marketingFields = [
    "InstagramID",
    "InstagramPW",
    "네이버검색광고ID",
    "네이버검색광고PW",
  ];
  const marketingCompleted = marketingFields.filter(
    (field) => !isEmpty(submission[field as keyof SubmissionData] as string)
  ).length;
  sections.push({
    name: "마케팅",
    label: "마케팅",
    fields: marketingFields,
    completed: marketingCompleted,
    total: marketingFields.length,
    percentage: Math.round((marketingCompleted / marketingFields.length) * 100),
    isComplete: marketingCompleted === marketingFields.length,
    href: "marketing#account-section",
  });

  // 전체 진행률
  const totalCompleted = sections.reduce((sum, s) => sum + s.completed, 0);
  const totalRequired = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPercentage = Math.round((totalCompleted / totalRequired) * 100);

  // 다음 작업 힌트
  const nextAction = getNextActionHint(sections);

  return {
    sections,
    totalCompleted,
    totalRequired,
    overallPercentage,
    nextAction,
  };
}

/**
 * 필드 라벨 매핑 (한글 표시용)
 */
export const FIELD_LABELS: Record<string, string> = {
  브랜드명: "브랜드명",
  사업자등록증URL: "사업자등록증",
  프로필사진URL: "프로필사진",
  명함시안: "명함 시안",
  명함색상: "명함 색상",
  로고선호스타일: "로고 선호 스타일",
  로고선호색상: "로고 선호 색상",
  로고선호폰트: "로고 선호 폰트",
  로고제작요청사항: "로고 제작 요청사항",
  홈페이지컬러컨셉: "홈페이지 컬러 컨셉",
  홈페이지스타일: "홈페이지 스타일",
  InstagramID: "인스타그램 ID",
  InstagramPW: "인스타그램 PW",
  네이버검색광고ID: "네이버 검색광고 ID",
  네이버검색광고PW: "네이버 검색광고 PW",
};

/**
 * 다음 작업 힌트 메시지 매핑
 */
const NEXT_ACTION_MESSAGES: Record<string, string> = {
  브랜드정보: "브랜드명을 입력해주세요",
  사업자등록증: "사업자등록증을 업로드해주세요",
  프로필사진: "프로필 사진을 업로드해주세요",
  명함스타일: "명함 스타일을 선택해주세요",
  로고: "로고 스타일을 선택해주세요",
  홈페이지: "홈페이지 컬러 컨셉을 선택해주세요",
  마케팅: "마케팅 계정 정보를 입력해주세요",
};

/**
 * 다음에 작성해야 할 섹션을 찾아 힌트 메시지 반환
 */
export function getNextActionHint(sections: ProgressSection[]): NextActionHint | undefined {
  // 미완료 섹션 중 첫 번째 찾기
  const incompleteSection = sections.find((s) => !s.isComplete);

  if (!incompleteSection) {
    return undefined; // 모두 완료
  }

  return {
    section: incompleteSection.name,
    sectionLabel: incompleteSection.label,
    message: NEXT_ACTION_MESSAGES[incompleteSection.name] || `${incompleteSection.label}을(를) 작성해주세요`,
    href: incompleteSection.href || "",
  };
}
