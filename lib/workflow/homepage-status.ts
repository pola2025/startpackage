export const HOMEPAGE_WORKFLOW_TYPE = "홈페이지";
export const HOMEPAGE_IN_PROGRESS_STATUS = "제작 진행 중";
export const HOMEPAGE_COMPLETE_STATUS = "제작 완료";

export function isHomepageWorkflow(type: string | null | undefined) {
  return type === HOMEPAGE_WORKFLOW_TYPE;
}

export function hasHomepageResultUrl(url: string | null | undefined) {
  return typeof url === "string" && url.trim().length > 0;
}

export function resolveAdminWorkflowStatus(
  type: string,
  requestedStatus: string,
  resultUrl?: string | null,
) {
  if (isHomepageWorkflow(type) && hasHomepageResultUrl(resultUrl)) {
    return HOMEPAGE_COMPLETE_STATUS;
  }

  return requestedStatus;
}

export function isHomepageCompleteStatus(
  type: string,
  status: string | null | undefined,
) {
  return (
    isHomepageWorkflow(type) &&
    (status === HOMEPAGE_COMPLETE_STATUS ||
      status === "제작완료" ||
      status === "최종확정")
  );
}
