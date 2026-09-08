import { requiresShippingStep } from "@/lib/design-confirm";

export function PrintColorNotice({ workflowType }: { workflowType: string }) {
  if (!requiresShippingStep(workflowType)) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-gray-800">
      <p className="font-semibold text-amber-900">인쇄 색상 안내</p>
      <p className="mt-1">
        화면에서 확인한 디자인 시안과 실제 인쇄물은 색상·밝기·채도에 차이가
        있을 수 있습니다. 모니터 설정, 용지, 잉크 및 인쇄소의 장비·공정에 따라
        같은 디자인 파일도 색감이 다르게 표현될 수 있습니다.
      </p>
      <p className="mt-2">
        현재 제작 서비스에는 시험 인쇄 후 색상을 정밀하게 맞추는
        <strong> 별도 인쇄 교정 서비스가 포함되어 있지 않습니다.</strong> 시안과
        실물의 색상을 완전히 동일하게 구현하기 어려운 점을 확인하신 후 진행해 주세요.
      </p>
    </div>
  );
}
