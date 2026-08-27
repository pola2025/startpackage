"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Loader2, Truck } from "lucide-react";
import {
  CONFIRM_AGREEMENTS,
  requiresShippingStep,
  type DesignConfirmPayload,
  type ShippingSnapshot,
} from "@/lib/design-confirm";

export type { DesignConfirmPayload, ShippingSnapshot };
export { requiresShippingStep, CONFIRM_AGREEMENTS };

interface SubmissionInfo {
  /** 배송지 필수 정책 대상 기수 여부 (서버가 내려준다) */
  _배송지필수?: boolean;
  브랜드명?: string | null;
  대표번호?: string | null;
  이메일?: string | null;
  주소?: string | null;
  인쇄물받을주소?: string | null;
  받는분이름?: string | null;
  수령연락처?: string | null;
  우편번호?: string | null;
}

interface DesignConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 워크플로우 종류 (명함·로고 등) */
  workflowType: string;
  /** 확정할 시안 차수 (없으면 표시하지 않음) */
  version?: number | null;
  /** 확정 처리 중 여부 (부모가 API 호출 상태를 넘긴다) */
  confirming?: boolean;
  onConfirm: (payload: DesignConfirmPayload) => void | Promise<void>;
}

export default function DesignConfirmDialog({
  open,
  onOpenChange,
  workflowType,
  version,
  confirming = false,
  onConfirm,
}: DesignConfirmDialogProps) {
  // 배송지 단계는 인쇄물이면서 정책 대상 기수일 때만 띄운다
  const [shippingPolicy, setShippingPolicy] = useState(false);
  const needsShipping = requiresShippingStep(workflowType) && shippingPolicy;
  const lastStep = needsShipping ? 3 : 2;

  const [step, setStep] = useState(1);
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1단계 — 표기 정보 대조
  const [checkedInfo, setCheckedInfo] = useState<Record<string, boolean>>({});

  // 2단계 — 배송지
  const [editingShipping, setEditingShipping] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [shipping, setShipping] = useState<ShippingSnapshot>({
    인쇄물받을주소: "",
    받는분이름: "",
    수령연락처: "",
    우편번호: "",
  });
  const [shippingAgreed, setShippingAgreed] = useState(false);

  // 3단계 — 최종 동의
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/submission");
      if (!res.ok) {
        setError("제출 정보를 불러오지 못했습니다.");
        return;
      }
      const data: SubmissionInfo = await res.json();
      setSubmission(data);
      setShippingPolicy(!!data._배송지필수);
      setShipping({
        인쇄물받을주소: data.인쇄물받을주소 || "",
        받는분이름: data.받는분이름 || "",
        수령연락처: data.수령연락처 || "",
        우편번호: data.우편번호 || "",
      });
      // 배송지가 비어 있으면 처음부터 입력 화면을 연다
      setEditingShipping(!data.인쇄물받을주소);
    } catch {
      setError("제출 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setCheckedInfo({});
    setAgreed({});
    setShippingAgreed(false);
    loadSubmission();
  }, [open, loadSubmission]);

  /** 시안에 표기되는 항목 — 값이 있는 것만 대조 대상으로 삼는다 */
  const infoItems = [
    { key: "브랜드명", label: "상호", value: submission?.브랜드명 },
    { key: "대표번호", label: "연락처", value: submission?.대표번호 },
    { key: "이메일", label: "이메일", value: submission?.이메일 },
    { key: "주소", label: "사업장 주소", value: submission?.주소 },
  ].filter((item) => !!item.value);

  const infoAllChecked =
    infoItems.length > 0 && infoItems.every((item) => checkedInfo[item.key]);
  const agreedCount = CONFIRM_AGREEMENTS.filter((a) => agreed[a.id]).length;
  const allAgreed = agreedCount === CONFIRM_AGREEMENTS.length;

  const shippingComplete =
    !!shipping.인쇄물받을주소.trim() &&
    !!shipping.받는분이름.trim() &&
    !!shipping.수령연락처.trim();

  const saveShipping = async () => {
    if (!shippingComplete) {
      setError("받는 분, 수령 연락처, 주소를 모두 입력해주세요.");
      return;
    }
    const phone = shipping.수령연락처.replace(/\s/g, "");
    if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(phone)) {
      setError("수령 연락처를 010-0000-0000 형식으로 입력해주세요.");
      return;
    }
    setSavingShipping(true);
    setError(null);
    try {
      const res = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          인쇄물받을주소: shipping.인쇄물받을주소.trim(),
          받는분이름: shipping.받는분이름.trim(),
          수령연락처: shipping.수령연락처.trim(),
          우편번호: shipping.우편번호.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "배송지 저장에 실패했습니다.");
        return;
      }
      setEditingShipping(false);
    } catch {
      setError("배송지 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingShipping(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    await onConfirm({
      shipping: needsShipping ? shipping : null,
      agreements: CONFIRM_AGREEMENTS.filter((a) => agreed[a.id]).map(
        (a) => a.id,
      ),
    });
  };

  const stepLabels = needsShipping
    ? ["시안 표기 정보", "배송지 확인", "최종 동의"]
    : ["시안 표기 정보", "최종 동의"];

  // 배송지 단계를 건너뛰는 경우 2단계가 곧 최종 동의 단계다
  const isAgreementStep = step === lastStep;
  const isShippingStep = needsShipping && step === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "시안에 들어간 정보를 확인해주세요"}
            {isShippingStep && "인쇄물을 어디로 받으시겠습니까?"}
            {isAgreementStep && "확정하면 되돌릴 수 없습니다"}
          </DialogTitle>
          <DialogDescription>
            {workflowType}
            {version ? ` · ${version}차 시안` : ""} 확정 절차 {step} /{" "}
            {lastStep}단계
          </DialogDescription>
        </DialogHeader>

        {/* 단계 표시 */}
        <div className="flex gap-1.5">
          {stepLabels.map((label, idx) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  idx + 1 <= step ? "bg-green-600" : "bg-gray-200"
                }`}
              />
              <p
                className={`text-[11px] mt-1 ${
                  idx + 1 <= step ? "text-green-700" : "text-gray-400"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            제출 정보를 불러오는 중입니다.
          </div>
        ) : (
          <div className="py-2 space-y-4">
            {/* ===== 1단계: 표기 정보 대조 ===== */}
            {step === 1 && (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    인쇄가 시작되면 오탈자 하나도 고칠 수 없습니다. 아래 항목을
                    시안과 하나씩 대조하고 체크해주세요.
                  </p>
                </div>

                {infoItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    대조할 표기 정보가 없습니다. 다음 단계로 넘어가주세요.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {infoItems.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={!!checkedInfo[item.key]}
                          onCheckedChange={(checked) =>
                            setCheckedInfo((prev) => ({
                              ...prev,
                              [item.key]: checked === true,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span className="text-sm">
                          <span className="block text-xs text-gray-400">
                            {item.label}
                          </span>
                          <span className="text-gray-900">{item.value}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  틀린 항목이 있으면 확정하지 말고 수정 요청을 보내주세요.
                </p>
              </>
            )}

            {/* ===== 2단계: 배송지 ===== */}
            {isShippingStep && (
              <>
                {!editingShipping ? (
                  <div className="p-5 border-2 border-green-500 bg-green-50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-bold text-gray-900 leading-snug">
                          {shipping.인쇄물받을주소}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          {shipping.받는분이름}
                          {shipping.수령연락처
                            ? ` · ${shipping.수령연락처}`
                            : ""}
                        </p>
                        {shipping.우편번호 && (
                          <p className="text-xs text-gray-500 mt-1">
                            우편번호 {shipping.우편번호}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingShipping(true)}
                        className="shrink-0"
                      >
                        주소 변경
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 border-2 border-red-400 bg-red-50 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <Truck className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-red-900">
                          받으실 주소를 입력해주세요
                        </p>
                        <p className="text-sm text-red-800 mt-1">
                          여기에 입력한 주소로 인쇄물이 발송됩니다.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="confirm-받는분" className="text-xs">
                          받는 분
                        </Label>
                        <Input
                          id="confirm-받는분"
                          value={shipping.받는분이름}
                          onChange={(e) =>
                            setShipping((prev) => ({
                              ...prev,
                              받는분이름: e.target.value,
                            }))
                          }
                          placeholder="예) 홍길동"
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="confirm-연락처" className="text-xs">
                          수령 연락처
                        </Label>
                        <Input
                          id="confirm-연락처"
                          value={shipping.수령연락처}
                          onChange={(e) =>
                            setShipping((prev) => ({
                              ...prev,
                              수령연락처: e.target.value,
                            }))
                          }
                          placeholder="예) 010-0000-0000"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="confirm-우편번호" className="text-xs">
                        우편번호 (선택)
                      </Label>
                      <Input
                        id="confirm-우편번호"
                        value={shipping.우편번호}
                        onChange={(e) =>
                          setShipping((prev) => ({
                            ...prev,
                            우편번호: e.target.value,
                          }))
                        }
                        placeholder="예) 06234"
                        className="bg-white max-w-[160px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="confirm-주소" className="text-xs">
                        받으실 주소
                      </Label>
                      <Input
                        id="confirm-주소"
                        value={shipping.인쇄물받을주소}
                        onChange={(e) =>
                          setShipping((prev) => ({
                            ...prev,
                            인쇄물받을주소: e.target.value,
                          }))
                        }
                        placeholder="예) 서울특별시 강남구 테헤란로 000 12층"
                        className="bg-white"
                      />
                      {submission?.주소 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShipping((prev) => ({
                              ...prev,
                              인쇄물받을주소: submission.주소 || "",
                            }))
                          }
                          className="text-xs text-blue-600 underline underline-offset-2"
                        >
                          사업장 주소와 같습니다
                        </button>
                      )}
                    </div>

                    <Button
                      onClick={saveShipping}
                      disabled={savingShipping}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {savingShipping ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        "이 주소로 저장하기"
                      )}
                    </Button>
                  </div>
                )}

                {!editingShipping && (
                  <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={shippingAgreed}
                      onCheckedChange={(checked) =>
                        setShippingAgreed(checked === true)
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-gray-800 leading-relaxed">
                      위 주소로 인쇄물을 받겠습니다. 주소가 잘못되어 반송되거나
                      분실될 경우 재발송 비용은 제가 부담한다는 점을
                      확인했습니다.
                    </span>
                  </label>
                )}
              </>
            )}

            {/* ===== 최종 동의 ===== */}
            {isAgreementStep && (
              <>
                <div className="rounded-lg border-2 border-red-400 overflow-hidden">
                  <div className="bg-red-600 px-4 py-2.5">
                    <p className="text-white font-bold text-sm">
                      확정 이후에는 아래 내용을 바꿀 수 없습니다
                    </p>
                  </div>
                  <div className="bg-red-50 px-4 py-3 space-y-2">
                    <p className="text-sm text-red-900">
                      <strong>01</strong> 시안의 문구, 색상, 배치를 포함한
                      디자인 일체
                    </p>
                    <p className="text-sm text-red-900">
                      <strong>02</strong> 인쇄 수량과 용지 사양
                    </p>
                    {needsShipping && (
                      <p className="text-sm text-red-900">
                        <strong>03</strong> 앞 단계에서 확인하신 배송지 주소
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-bold text-gray-400 mb-1.5">
                    확정 직후 벌어지는 일
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    확정 접수 → 인쇄소 발주 → 인쇄 진행 → 발송 순으로 진행되며,
                    발주가 인쇄소로 넘어간 뒤에는 저희도 되돌릴 수 없습니다.
                    잘못 확정한 내용을 다시 만들려면 인쇄비와 배송비를 새로
                    지불하셔야 합니다.
                  </p>
                </div>

                <div className="space-y-2">
                  {CONFIRM_AGREEMENTS.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!agreed[item.id]}
                        onCheckedChange={(checked) =>
                          setAgreed((prev) => ({
                            ...prev,
                            [item.id]: checked === true,
                          }))
                        }
                        className="mt-0.5"
                      />
                      <span className="text-sm text-gray-800 leading-relaxed">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="bg-gray-900 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">최종 확정 요약</p>
                  <div className="space-y-1.5 text-sm text-white">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">항목</span>
                      <span className="font-semibold">{workflowType}</span>
                    </div>
                    {version ? (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">확정 시안</span>
                        <span className="font-semibold">{version}차 시안</span>
                      </div>
                    ) : null}
                    {needsShipping && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-400">배송지</span>
                        <span className="font-semibold text-right">
                          {shipping.인쇄물받을주소}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== 하단 버튼 ===== */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t">
          {step === 1 ? (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              이전
            </Button>
          )}

          <div className="flex items-center gap-3">
            {step === 1 && infoItems.length > 0 && (
              <span className="text-xs text-gray-400">
                {infoItems.filter((i) => checkedInfo[i.key]).length} /{" "}
                {infoItems.length} 확인
              </span>
            )}
            {isAgreementStep && (
              <span className="text-xs text-gray-400">
                {agreedCount} / {CONFIRM_AGREEMENTS.length} 동의
              </span>
            )}

            {!isAgreementStep ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  loading ||
                  (step === 1 && infoItems.length > 0 && !infoAllChecked) ||
                  (isShippingStep &&
                    (editingShipping || !shippingComplete || !shippingAgreed))
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                다음 단계
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={!allAgreed || confirming}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    확정 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />이 시안으로 확정
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
