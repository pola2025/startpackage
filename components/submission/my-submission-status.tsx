"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Palette,
  Key,
  Globe,
  Truck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 워크플로우 상태 매핑
const WORKFLOW_STATUS_MAP: Record<
  string,
  { label: string; color: string; step: number }
> = {
  대기: { label: "접수 대기", color: "text-gray-500", step: 0 },
  시안중: { label: "시안 준비 중", color: "text-gold-600", step: 1 },
  발주대기: { label: "확인 필요", color: "text-amber-600", step: 2 },
  발주요청: { label: "제작 요청됨", color: "text-gold-600", step: 2 },
  발주완료: { label: "제작 중", color: "text-purple-600", step: 3 },
  최종확정: { label: "시안 확정", color: "text-green-600", step: 2 },
  제작완료: { label: "제작 완료", color: "text-green-600", step: 4 },
  발송완료: { label: "발송 완료", color: "text-green-700", step: 5 },
};

// 타임라인 스텝
const TIMELINE_STEPS = ["접수", "시안", "확정", "제작", "발송"];

interface Workflow {
  id: string;
  type: string;
  status: string;
  시안URL?: string | null;
  택배회사?: string | null;
  운송장번호?: string | null;
  예상도착일?: string | null;
}

interface MySubmissionStatusProps {
  submission: any;
  workflows: Workflow[];
  user: {
    이름?: string;
    연락처?: string;
  };
  onNavigateToSection: (tab: string, hash?: string) => void;
}

// 아코디언 섹션 컴포넌트
function AccordionSection({
  title,
  icon: Icon,
  isComplete,
  isInProgress,
  completedText,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isComplete: boolean;
  isInProgress?: boolean;
  completedText?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const statusIcon = isComplete ? (
    <CheckCircle2 className="w-5 h-5 text-green-500" />
  ) : isInProgress ? (
    <Clock className="w-5 h-5 text-gold-500" />
  ) : (
    <AlertCircle className="w-5 h-5 text-amber-500" />
  );

  const statusText = isComplete
    ? completedText || "완료"
    : isInProgress
      ? "진행중"
      : "미완료";

  const statusColor = isComplete
    ? "text-green-600 bg-green-50"
    : isInProgress
      ? "text-gold-600 bg-gold-50"
      : "text-amber-600 bg-amber-50";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              statusColor,
            )}
          >
            {statusText}
          </span>
          {statusIcon}
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 bg-gray-50 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// 워크플로우 타임라인 컴포넌트
function WorkflowTimeline({ workflow }: { workflow: Workflow }) {
  const statusInfo =
    WORKFLOW_STATUS_MAP[workflow.status] || WORKFLOW_STATUS_MAP["대기"];
  const currentStep = statusInfo.step;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        {TIMELINE_STEPS.map((step, index) => (
          <div key={step} className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                index <= currentStep
                  ? "bg-navy-900 text-white"
                  : "bg-gray-200 text-gray-500",
              )}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span
              className={cn(
                "text-xs mt-1",
                index <= currentStep
                  ? "text-gold-600 font-medium"
                  : "text-gray-400",
              )}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center mt-1">
        {TIMELINE_STEPS.map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex-1 h-1 rounded",
              index < TIMELINE_STEPS.length - 1
                ? index < currentStep
                  ? "bg-navy-900"
                  : "bg-gray-200"
                : "hidden",
            )}
          />
        ))}
      </div>
      <p className={cn("text-sm mt-2 font-medium", statusInfo.color)}>
        현재: {statusInfo.label}
        {workflow.예상도착일 && (
          <span className="text-gray-500 font-normal ml-2">
            (예상 도착: {workflow.예상도착일})
          </span>
        )}
      </p>
    </div>
  );
}

// 정보 행 컴포넌트
function InfoRow({
  label,
  value,
  masked = false,
}: {
  label: string;
  value?: string | null;
  masked?: boolean;
}) {
  const displayValue = !value
    ? "-"
    : masked
      ? value.length > 4
        ? value.slice(0, 2) + "***" + value.slice(-2)
        : "****"
      : value;

  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{displayValue}</span>
    </div>
  );
}

// 파일 상태 컴포넌트
function FileStatus({ label, url }: { label: string; url?: string | null }) {
  const hasFile = !!url;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={cn(
          "text-sm font-medium flex items-center gap-1",
          hasFile ? "text-green-600" : "text-gray-400",
        )}
      >
        {hasFile ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            등록됨
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            미등록
          </>
        )}
      </span>
    </div>
  );
}

export function MySubmissionStatus({
  submission,
  workflows,
  user,
  onNavigateToSection,
}: MySubmissionStatusProps) {
  // 각 섹션 완료 여부 계산
  const sectionStatus = useMemo(() => {
    const s = submission || {};

    // 1. 기본 정보
    const basicInfoComplete = !!(s.브랜드명 && s.업종 && s.주소);

    // 2. 서류 제출
    const requiredDocs = [s.사업자등록증URL, s.프로필사진URL];
    const docsComplete = requiredDocs.every(Boolean);
    const docsCount = requiredDocs.filter(Boolean).length;

    // 3. 디자인 선택
    const logoSelected = !!(s.로고선호스타일 || s.로고선호색상);
    const namecardSelected = !!s.명함시안;
    const designInProgress = workflows.some((w) =>
      ["시안중", "발주대기", "발주요청"].includes(w.status),
    );
    const designComplete = workflows.some((w) =>
      ["발주완료", "최종확정", "제작완료", "발송완료"].includes(w.status),
    );

    // 4. 계정 정보
    const accountFields = [s.메타광고관리자값, s.InstagramID];
    const accountComplete = accountFields.some(Boolean);

    // 5. 홈페이지
    const homepageComplete = !!s.홈페이지제작방식;

    return {
      basicInfo: { complete: basicInfoComplete },
      docs: {
        complete: docsComplete,
        count: docsCount,
        total: requiredDocs.length,
      },
      design: {
        complete: designComplete,
        inProgress: designInProgress || logoSelected || namecardSelected,
      },
      account: { complete: accountComplete },
      homepage: { complete: homepageComplete },
    };
  }, [submission, workflows]);

  // 전체 완료율
  const overallProgress = useMemo(() => {
    const sections = [
      sectionStatus.basicInfo.complete,
      sectionStatus.docs.complete,
      sectionStatus.design.complete,
      sectionStatus.account.complete,
      sectionStatus.homepage.complete,
    ];
    const completed = sections.filter(Boolean).length;
    return Math.round((completed / sections.length) * 100);
  }, [sectionStatus]);

  // 워크플로우 타입별 그룹화
  const workflowsByType = useMemo(() => {
    const map: Record<string, Workflow> = {};
    workflows.forEach((w) => {
      map[w.type] = w;
    });
    return map;
  }, [workflows]);

  if (!submission) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>접수된 정보가 없습니다.</p>
          <p className="text-sm mt-1">자료를 먼저 제출해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-gold-50 to-gold-100 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">내 접수 현황</h2>
          <span className="text-2xl font-bold text-gold-600">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {overallProgress === 100
            ? "모든 정보가 입력되었습니다!"
            : `5개 항목 중 ${Math.round(overallProgress / 20)}개 완료`}
        </p>
      </div>

      {/* 아코디언 섹션들 */}
      <div className="p-4 sm:p-6 space-y-3">
        {/* 1단계: 기본 정보 */}
        <AccordionSection
          title="1단계: 기본 정보"
          icon={User}
          isComplete={sectionStatus.basicInfo.complete}
          defaultOpen={!sectionStatus.basicInfo.complete}
        >
          <div className="bg-white rounded-lg p-4 mt-3">
            <InfoRow label="이름" value={user.이름} />
            <InfoRow label="연락처" value={user.연락처} />
            <InfoRow label="브랜드명" value={submission.브랜드명} />
            <InfoRow
              label="영문 브랜드명"
              value={submission.brandNameEnglish}
            />
            <InfoRow label="업종" value={submission.업종} />
            <InfoRow label="주소" value={submission.주소} />
            <button
              onClick={() => onNavigateToSection("basic")}
              className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
            >
              정보 수정하기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </AccordionSection>

        {/* 2단계: 서류 제출 */}
        <AccordionSection
          title="2단계: 서류 제출"
          icon={FileText}
          isComplete={sectionStatus.docs.complete}
          completedText={`${sectionStatus.docs.count}/${sectionStatus.docs.total} 완료`}
          defaultOpen={!sectionStatus.docs.complete}
        >
          <div className="bg-white rounded-lg p-4 mt-3">
            <FileStatus label="사업자등록증" url={submission.사업자등록증URL} />
            <FileStatus label="프로필 사진" url={submission.프로필사진URL} />
            <FileStatus
              label="대표자 신분증"
              url={submission.대표자신분증URL}
            />
            <FileStatus
              label="통신서비스 이용증명원"
              url={submission.통신서비스이용증명원URL}
            />
            <button
              onClick={() => onNavigateToSection("files")}
              className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
            >
              서류 수정하기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </AccordionSection>

        {/* 3단계: 디자인 선택 */}
        <AccordionSection
          title="3단계: 디자인 선택"
          icon={Palette}
          isComplete={sectionStatus.design.complete}
          isInProgress={
            sectionStatus.design.inProgress && !sectionStatus.design.complete
          }
          defaultOpen={
            sectionStatus.design.inProgress && !sectionStatus.design.complete
          }
        >
          <div className="space-y-4 mt-3">
            {/* 로고 */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">로고 디자인</span>
              </div>
              {submission.로고선호스타일 || submission.로고선호색상 ? (
                <>
                  <div className="text-sm text-gray-600 space-y-1">
                    {submission.로고선호스타일 && (
                      <p>
                        스타일:{" "}
                        <span className="font-medium text-gray-900">
                          {submission.로고선호스타일}
                        </span>
                      </p>
                    )}
                    {submission.로고선호폰트 && (
                      <p>
                        폰트:{" "}
                        <span className="font-medium text-gray-900">
                          {submission.로고선호폰트}
                        </span>
                      </p>
                    )}
                    {submission.로고선호색상 && (
                      <p>
                        색상:{" "}
                        <span className="font-medium text-gray-900">
                          {submission.로고선호색상}
                        </span>
                      </p>
                    )}
                  </div>
                  {workflowsByType["로고"] && (
                    <WorkflowTimeline workflow={workflowsByType["로고"]} />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  아직 선택하지 않았습니다
                </p>
              )}
              <button
                onClick={() => onNavigateToSection("logo")}
                className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
              >
                로고 설정하기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 명함 */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gold-600" />
                <span className="font-medium text-gray-900">명함 디자인</span>
              </div>
              {submission.명함시안 ? (
                <>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      선택 시안:{" "}
                      <span className="font-medium text-gray-900">
                        {submission.명함시안}
                      </span>
                    </p>
                    {submission.명함색상 && (
                      <p className="flex items-center gap-2">
                        색상:
                        <span
                          className="inline-block w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: submission.명함색상 }}
                        />
                        <span className="font-medium text-gray-900">
                          {submission.명함색상}
                        </span>
                      </p>
                    )}
                  </div>
                  {workflowsByType["명함"] && (
                    <WorkflowTimeline workflow={workflowsByType["명함"]} />
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  아직 선택하지 않았습니다
                </p>
              )}
              <button
                onClick={() => onNavigateToSection("namecard")}
                className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
              >
                명함 설정하기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 기타 인쇄물 진행 상태 */}
            {(workflowsByType["명찰"] ||
              workflowsByType["대봉투"] ||
              workflowsByType["자문계약서"]) && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-900">
                    기타 인쇄물 진행 현황
                  </span>
                </div>
                <div className="space-y-3">
                  {["명찰", "대봉투", "자문계약서"].map((type) => {
                    const wf = workflowsByType[type];
                    if (!wf) return null;
                    const status =
                      WORKFLOW_STATUS_MAP[wf.status] ||
                      WORKFLOW_STATUS_MAP["대기"];
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-sm text-gray-600">{type}</span>
                        <span
                          className={cn("text-sm font-medium", status.color)}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 4단계: 계정 정보 */}
        <AccordionSection
          title="4단계: 계정 정보"
          icon={Key}
          isComplete={sectionStatus.account.complete}
          defaultOpen={false}
        >
          <div className="bg-white rounded-lg p-4 mt-3">
            <InfoRow
              label="메타 광고관리자"
              value={submission.메타광고관리자값}
            />
            <InfoRow label="Instagram ID" value={submission.InstagramID} />
            <InfoRow label="Instagram PW" value={submission.InstagramPW} />
            <InfoRow label="Gmail ID" value={submission.GmailID} />
            <InfoRow label="Gmail PW" value={submission.GmailPW} />
            <InfoRow
              label="네이버검색광고 ID"
              value={submission.네이버검색광고ID}
            />
            <InfoRow
              label="네이버검색광고 PW"
              value={submission.네이버검색광고PW}
            />
            <InfoRow
              label="네이버클라우드 ID"
              value={submission.네이버클라우드ID}
            />
            <InfoRow
              label="네이버클라우드 PW"
              value={submission.네이버클라우드PW}
            />
            <button
              onClick={() => onNavigateToSection("marketing")}
              className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
            >
              계정 정보 수정하기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </AccordionSection>

        {/* 5단계: 홈페이지 설정 */}
        <AccordionSection
          title="5단계: 홈페이지 설정"
          icon={Globe}
          isComplete={sectionStatus.homepage.complete}
          defaultOpen={false}
        >
          <div className="bg-white rounded-lg p-4 mt-3">
            <InfoRow label="도메인 주소" value={submission.도메인주소} />
            <InfoRow
              label="도메인 관리 사이트"
              value={submission.도메인관리사이트}
            />
            <InfoRow label="도메인 관리 ID" value={submission.도메인관리ID} />
            <InfoRow label="도메인 관리 PW" value={submission.도메인관리PW} />
            <button
              onClick={() => onNavigateToSection("basic", "homepage")}
              className="w-full mt-3 text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
            >
              홈페이지 설정하기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
