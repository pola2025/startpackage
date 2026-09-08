import { isHomepageCompleteStatus } from "@/lib/workflow/homepage-status";

export interface ProjectProgressWorkflow {
  id: string;
  type: string;
  status: string;
  시안URL?: string | null;
  최종확정일?: string | null;
  발주요청일?: string | null;
  updatedAt?: string;
}

export type ProjectProgressKind =
  | "complete"
  | "customer"
  | "working"
  | "waiting"
  | "unknown";

export interface ProjectProgressStage {
  label: string;
  state: "done" | "current" | "pending";
}

export interface ProjectProgressView {
  workflow: ProjectProgressWorkflow;
  kind: ProjectProgressKind;
  label: string;
  owner: string;
  actionLabel: string;
  href: string;
  stages: ProjectProgressStage[];
  currentLabel: string;
}

const KNOWN_STATUSES = new Set([
  "대기",
  "시안중",
  "시안제작중",
  "시안컨펌요청",
  "시안확정",
  "최종확정",
  "발주대기",
  "발주요청",
  "발주완료",
  "제작완료",
  "제작 완료",
  "발송완료",
  "제작 진행 중",
]);

function isPrint(type: string) {
  return type !== "로고" && type !== "홈페이지";
}

function isComplete(workflow: ProjectProgressWorkflow) {
  if (isPrint(workflow.type)) return workflow.status === "발송완료";
  if (workflow.type === "로고")
    return ["최종확정", "시안확정"].includes(workflow.status);
  return (
    workflow.type === "홈페이지" &&
    (isHomepageCompleteStatus(workflow.type, workflow.status) ||
      Boolean(workflow.시안URL?.trim()))
  );
}

function getKind(workflow: ProjectProgressWorkflow): ProjectProgressKind {
  if (isComplete(workflow)) return "complete";

  if (
    workflow.status === "시안컨펌요청" ||
    workflow.status === "발주대기" ||
    (isPrint(workflow.type) && workflow.status === "시안확정") ||
    (Boolean(workflow.시안URL?.trim()) && workflow.status === "시안중")
  ) {
    return "customer";
  }

  if (workflow.status === "대기") return "waiting";
  if (KNOWN_STATUSES.has(workflow.status)) return "working";
  return "unknown";
}

function getOwner(
  workflow: ProjectProgressWorkflow,
  kind: ProjectProgressKind,
) {
  if (kind === "customer") return "고객 확인 필요";
  if (kind === "complete")
    return workflow.type === "로고"
      ? "디자인 확정 완료"
      : workflow.type === "홈페이지"
        ? "홈페이지 제작 완료"
        : "발송 완료";
  if (kind === "waiting") return "진행 대기";
  if (workflow.status === "제작완료") return "발송 준비";
  if (workflow.status === "발주완료") return "인쇄소 제작";
  if (workflow.status === "발주요청") return "폴라애드 발주 확인";
  if (workflow.status === "최종확정") return "폴라애드 발주 준비";
  if (kind === "unknown") return "상태 확인 필요";
  return workflow.type === "홈페이지" ? "폴라애드 제작" : "폴라애드 디자인";
}

function getHref(workflow: ProjectProgressWorkflow) {
  if (workflow.type === "홈페이지" && workflow.status === "대기") {
    return "/dashboard/homepage";
  }
  return `/dashboard/workflows?open=${encodeURIComponent(workflow.id)}`;
}

function getActionLabel(
  workflow: ProjectProgressWorkflow,
  kind: ProjectProgressKind,
) {
  if (workflow.type === "홈페이지" && workflow.status === "대기")
    return "자료 입력";
  if (kind === "customer") {
    if (workflow.status === "발주대기") return "시안·발주 확인";
    if (workflow.status === "시안확정") return "발주 가능 여부 확인";
    return "시안 확인";
  }
  if (kind === "complete") return "진행 결과 보기";
  return "진행 상태 보기";
}

function getStageIndex(workflow: ProjectProgressWorkflow) {
  if (workflow.type === "로고") {
    if (["최종확정", "시안확정"].includes(workflow.status)) return 3;
    if (
      workflow.status === "시안컨펌요청" ||
      (workflow.status === "시안중" && workflow.시안URL)
    )
      return 2;
    if (["시안중", "시안제작중"].includes(workflow.status)) return 1;
    return 0;
  }

  if (workflow.type === "홈페이지") {
    if (isComplete(workflow)) return 2;
    return workflow.status === "대기" ? 0 : 1;
  }

  if (workflow.status === "발송완료") return 4;
  if (["발주완료", "제작완료"].includes(workflow.status)) return 3;
  if (workflow.status === "시안컨펌요청") return 1;
  if (["시안확정", "최종확정", "발주요청"].includes(workflow.status)) return 2;
  if (
    workflow.status === "발주대기" ||
    (workflow.status === "시안중" && workflow.시안URL)
  )
    return 1;
  return 0;
}

function getStageLabels(type: string) {
  if (type === "로고") return ["접수", "시안 제작", "고객 검토", "디자인 확정"];
  if (type === "홈페이지") return ["자료 입력", "제작 진행", "제작 완료"];
  return ["시안 제작", "고객 검토", "발주 확인", "인쇄 제작", "발송"];
}

function getCurrentLabel(
  workflow: ProjectProgressWorkflow,
  kind: ProjectProgressKind,
) {
  if (kind === "unknown") return `현재 상태: ${workflow.status}`;
  if (kind === "complete") return workflow.status;
  if (workflow.status === "발주대기") return "시안 확인과 발주 전 확인";
  if (workflow.status === "시안컨펌요청") return "시안 확인과 확정";
  return workflow.status;
}

export function getProjectProgressView(
  workflow: ProjectProgressWorkflow,
): ProjectProgressView {
  const kind = getKind(workflow);
  const currentIndex = getStageIndex(workflow);
  const labels = getStageLabels(workflow.type);
  const stages = labels.map((label, index) => ({
    label,
    state:
      kind === "waiting" || kind === "unknown"
        ? "pending"
        : kind === "complete" ||
            index < currentIndex ||
            (isPrint(workflow.type) &&
              workflow.status === "제작완료" &&
              index === currentIndex)
          ? "done"
          : index === currentIndex
            ? "current"
            : "pending",
  })) as ProjectProgressStage[];

  return {
    workflow,
    kind,
    label: workflow.status,
    owner: getOwner(workflow, kind),
    actionLabel: getActionLabel(workflow, kind),
    href: getHref(workflow),
    stages,
    currentLabel: getCurrentLabel(workflow, kind),
  };
}

export function getProjectProgressSummary(
  workflows: ProjectProgressWorkflow[],
) {
  const views = workflows.map(getProjectProgressView);
  return {
    total: views.length,
    customer: views.filter((view) => view.kind === "customer").length,
    working: views.filter((view) => view.kind === "working").length,
    waiting: views.filter((view) => view.kind === "waiting").length,
    unknown: views.filter((view) => view.kind === "unknown").length,
    complete: views.filter((view) => view.kind === "complete").length,
    views,
  };
}
