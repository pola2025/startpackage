"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
} from "lucide-react";
import { MASKED_SECRET } from "@/lib/security/submission-secret-mask";
import type { MetaSetupStage } from "@/lib/submission/parts";

type AccountType = "instagram" | "google";

interface MetaSetupView {
  stage: MetaSetupStage;
  type: AccountType | null;
  loginId: string | null;
  hasPassword: boolean;
  memo: string | null;
  requestedAt: number | null;
  doneAt: number | null;
  emailSentAt: number | null;
  tokens: { systemUserToken: string; threadsToken: string } | null;
}

const ACCOUNT_LABEL: Record<AccountType, string> = {
  instagram: "인스타그램",
  google: "구글",
};

const formatDateTime = (ms: number | null) => {
  if (!ms) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
};

const maskToken = (token: string) =>
  token.length > 12 ? `${token.slice(0, 6)}••••••${token.slice(-4)}` : "••••••";

function TokenRow({ label, token }: { label: string; token: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("복사하지 못했습니다. 토큰을 길게 눌러 직접 복사해 주세요.");
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-bold text-gray-900">{label}</p>
      <p className="mt-2 break-all rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800">
        {visible ? token : maskToken(token)}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setVisible(!visible)}
        >
          {visible ? (
            <EyeOff className="mr-1.5 h-4 w-4" />
          ) : (
            <Eye className="mr-1.5 h-4 w-4" />
          )}
          {visible ? "가리기" : "보기"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-600" />
          ) : (
            <Copy className="mr-1.5 h-4 w-4" />
          )}
          {copied ? "복사했어요" : "복사"}
        </Button>
      </div>
    </div>
  );
}

export default function MetaSetupPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<MetaSetupView | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [type, setType] = useState<AccountType | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [memo, setMemo] = useState("");

  const fetchView = useCallback(async () => {
    try {
      const response = await fetch("/api/meta-setup");
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoadError(result.error || "요청 내용을 불러오지 못했습니다.");
        return null;
      }
      setLoadError(null);
      setView(result);
      return result as MetaSetupView;
    } catch (error) {
      console.error("Failed to fetch meta setup:", error);
      setLoadError("요청 내용을 불러오지 못했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

  // 저장된 값으로 입력 칸을 채운다. 비밀번호는 원문 대신 가림 값을 넣어 두면 서버가 기존 값을 쓴다.
  const fillFromView = (
    source: MetaSetupView,
    nextType: AccountType | null,
  ) => {
    const sameType = nextType !== null && nextType === source.type;
    setType(nextType);
    setLoginId(sameType ? (source.loginId ?? "") : "");
    setPassword(sameType && source.hasPassword ? MASKED_SECRET : "");
  };

  const startEditing = () => {
    if (!view) return;
    fillFromView(view, view.type);
    setMemo(view.memo ?? "");
    setFormError(null);
    setEditing(true);
  };

  const chooseType = (nextType: AccountType) => {
    if (nextType === type) return;
    if (view) fillFromView(view, nextType);
    else setType(nextType);
    setFormError(null);
  };

  const canSubmit =
    type !== null &&
    loginId.trim().length > 0 &&
    password.length > 0 &&
    !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !type) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch("/api/meta-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          loginId: loginId.trim(),
          password,
          memo: memo.trim() || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result.error || "요청을 보내지 못했습니다.");
        return;
      }
      await fetchView();
      setEditing(false);
      setPassword("");
      window.dispatchEvent(new Event("meta-setup-updated"));
    } catch (error) {
      console.error("Meta setup request error:", error);
      setFormError("요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gold-600" />
      </div>
    );
  }

  const stage = view?.stage ?? "none";
  const showForm = !loadError && (stage === "none" || editing);
  const accountLabel = type ? ACCOUNT_LABEL[type] : "";

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0 max-w-2xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Smartphone className="w-6 h-6 md:w-7 md:h-7" />
          Meta 설정요청
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          페이스북·인스타그램 계정 정보를 보내 주시면 폴라애드가 교육 전에
          설정해 둡니다.
        </p>
      </div>

      {/* 교육 전 안내 */}
      {stage !== "done" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            마케팅 교육 전에 반드시 요청해 주세요
          </p>
          <p className="mt-1 text-[13px] text-amber-900 leading-relaxed">
            폴라애드가 페이스북 페이지·인스타그램·광고 계정 설정을 교육 전에
            미리 해 둡니다. 요청하지 않으면 교육 당일 실습을 바로 따라오기
            어려워 원활하게 교육에 참여할 수 없습니다.
          </p>
        </div>
      )}

      {loadError && (
        <Card className="border-red-200">
          <CardContent className="p-5">
            <p className="text-sm text-red-700">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setLoading(true);
                fetchView();
              }}
            >
              다시 불러오기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 설정 완료: 토큰 2개 */}
      {!loadError && stage === "done" && view && !editing && (
        <Card className="border-4 border-emerald-300">
          <CardContent className="p-5 space-y-4">
            <div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                설정 완료
              </span>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                Meta 설정이 끝났어요
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatDateTime(view.doneAt)} 설정 완료 · 교육에서 쓰는 토큰
                2개입니다.
              </p>
            </div>
            {view.tokens ? (
              <div className="space-y-3">
                <TokenRow
                  label="시스템사용자 토큰"
                  token={view.tokens.systemUserToken}
                />
                <TokenRow
                  label="쓰레드 토큰"
                  token={view.tokens.threadsToken}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                토큰을 불러오지 못했습니다. 문의하기로 알려 주세요.
              </p>
            )}
            <p className="text-xs text-gray-500 leading-relaxed">
              {view.emailSentAt
                ? `같은 토큰을 ${formatDateTime(view.emailSentAt)}에 가입하신 메일로도 보내 드렸습니다. `
                : "토큰 메일을 아직 보내지 못했습니다. 메일이 필요하면 문의하기로 알려 주세요. "}
              토큰은 비밀번호와 같으니 다른 사람에게 보내지 마세요.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 요청 완료(또는 설정 완료 후) 요청 내용 */}
      {!loadError && stage !== "none" && view && !editing && (
        <Card className="border-gray-200">
          <CardContent className="p-5">
            {stage === "requested" && (
              <>
                <span className="rounded-full bg-gov-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-gov-blue">
                  요청 완료
                </span>
                <h2 className="mt-2 text-lg font-bold text-gray-900">
                  Meta 설정을 요청했어요
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  폴라애드가 교육 전에 설정합니다. 설정 중 로그인 확인 문자가
                  가면 연락드립니다.
                </p>
              </>
            )}
            {stage === "done" && (
              <h2 className="text-base font-bold text-gray-900">
                보낸 계정 정보
              </h2>
            )}
            <dl className="mt-3 grid grid-cols-[88px_1fr] gap-y-1.5 text-sm">
              <dt className="text-gray-500">요청 일시</dt>
              <dd className="text-gray-900">
                {formatDateTime(view.requestedAt)}
              </dd>
              <dt className="text-gray-500">계정</dt>
              <dd className="text-gray-900 break-all">
                {view.type ? ACCOUNT_LABEL[view.type] : "-"}
                {view.loginId ? ` · ${view.loginId}` : ""}
              </dd>
              <dt className="text-gray-500">비밀번호</dt>
              <dd className="text-gray-900">
                {view.hasPassword ? MASKED_SECRET : "-"}
              </dd>
              {view.memo && (
                <>
                  <dt className="text-gray-500">전달 내용</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap break-words">
                    {view.memo}
                  </dd>
                </>
              )}
            </dl>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={startEditing}
            >
              정보 수정하기
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              비밀번호를 바꾸셨다면 수정해 주세요. 수정한 내용은 담당자에게 다시
              전달됩니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 요청 입력 */}
      {showForm && (
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  인스타그램 계정이 있나요?
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup">
                  {(["instagram", "google"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={type === option}
                      onClick={() => chooseType(option)}
                      className={
                        type === option
                          ? "rounded-lg border-2 border-navy-900 bg-navy-900 py-3 text-sm font-bold text-white"
                          : "rounded-lg border-2 border-gray-200 bg-white py-3 text-sm font-bold text-gray-600 hover:border-gray-300"
                      }
                    >
                      {option === "instagram" ? "있어요" : "없어요"}
                    </button>
                  ))}
                </div>
              </div>

              {type && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="metaLoginId" className="text-sm">
                      {type === "google"
                        ? "구글 아이디 (Gmail)"
                        : "인스타그램 아이디"}{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="metaLoginId"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={
                        type === "google"
                          ? "example@gmail.com"
                          : "아이디, 이메일 또는 전화번호"
                      }
                      autoComplete="off"
                      maxLength={256}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="metaPassword" className="text-sm">
                      {accountLabel} 비밀번호{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="metaPassword"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => {
                        if (password === MASKED_SECRET) setPassword("");
                      }}
                      onBlur={() => {
                        if (
                          !password &&
                          view?.hasPassword &&
                          view.type === type
                        )
                          setPassword(MASKED_SECRET);
                      }}
                      placeholder="비밀번호"
                      autoComplete="new-password"
                      maxLength={256}
                    />
                    {password === MASKED_SECRET && (
                      <p className="text-xs text-gray-500">
                        비워 두면 전에 보낸 비밀번호를 그대로 씁니다.
                      </p>
                    )}
                  </div>
                  {type === "google" && (
                    <p className="text-xs text-gray-500">
                      폴라애드가 이 구글 계정으로 인스타그램을 만들고 Meta
                      설정을 진행합니다.
                    </p>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="metaMemo" className="text-sm">
                      전달할 내용{" "}
                      <span className="font-normal text-gray-400">(선택)</span>
                    </Label>
                    <Textarea
                      id="metaMemo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="예: 2단계 인증을 쓰고 있어요, 로그인 문자는 대표 번호로 와요"
                      maxLength={1000}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    입력한 비밀번호는 암호화해 저장하고 설정 담당자만
                    확인합니다. 설정 중 로그인 확인 문자가 가면 폴라애드가
                    연락드립니다.
                  </p>
                </>
              )}

              {formError && (
                <p className="text-sm text-red-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-2">
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(false);
                      setFormError(null);
                    }}
                    disabled={submitting}
                  >
                    취소
                  </Button>
                )}
                <Button
                  type="submit"
                  className="flex-1 bg-navy-900 hover:bg-navy-800 text-white"
                  disabled={!canSubmit}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editing ? "수정한 내용 보내기" : "Meta 설정 요청하기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
