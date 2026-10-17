"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Facebook, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MASKED_SECRET } from "@/lib/security/submission-secret-mask";
import { META_SETUP_CHANGED_EVENT } from "@/lib/admin/meta-setup-events";

type Stage = "pending" | "done";
type AccountType = "instagram" | "google";
export type MetaSetupItem = {
  userId: string;
  name: string | null;
  cohortName: string | null;
  brandName: string | null;
  email: string | null;
  type: AccountType | null;
  loginId: string | null;
  hasPassword: boolean;
  memo: string | null;
  requestedAt: number | null;
  doneAt: number | null;
  emailSentAt: number | null;
};
type Counts = { pending: number; done: number };
type ListState = { items: MetaSetupItem[]; nextCursor: string | null };
type Outcome = { ok: boolean; message: string };

const TYPE_LABEL: Record<AccountType, string> = {
  instagram: "인스타",
  google: "구글",
};
const TYPE_STYLE: Record<AccountType, string> = {
  instagram: "bg-pink-50 text-pink-700",
  google: "bg-sky-50 text-sky-700",
};
const KST = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatAt(ms: number | null) {
  if (!ms) return "-";
  const parts = Object.fromEntries(
    KST.formatToParts(new Date(ms)).map((part) => [part.type, part.value]),
  );
  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function timeAgo(ms: number | null) {
  if (!ms) return "";
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/** 토큰 2개 저장 → 교육생 메일 → 슬랙·텔레그램 (토큰 칸에 가림 값을 보내면 저장된 토큰으로 메일만 다시 보낸다) */
async function completeMetaSetup(
  userId: string,
  systemUserToken: string,
  threadsToken: string,
): Promise<Outcome> {
  try {
    const response = await fetch(`/api/admin/meta-setup/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemUserToken, threadsToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      return { ok: false, message: data.error || "완료 처리에 실패했습니다." };
    return data.emailSent
      ? {
          ok: true,
          message: `설정 완료로 저장했고 ${data.email}(으)로 토큰 메일을 보냈습니다.`,
        }
      : {
          ok: false,
          message: `설정 완료는 저장했지만 메일을 보내지 못했습니다: ${data.emailError || "원인을 알 수 없습니다"}`,
        };
  } catch {
    return { ok: false, message: "완료 처리 중 오류가 발생했습니다." };
  }
}

function NameLine({ item, size }: { item: MetaSetupItem; size: "lg" | "xl" }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2
        className={`${size === "xl" ? "text-xl" : "text-lg"} shrink-0 font-bold leading-tight text-gray-900`}
      >
        {item.name || "이름 없음"}
      </h2>
      {item.cohortName && (
        <span className="shrink-0 rounded-md bg-navy-800 px-2 py-0.5 text-sm font-bold text-white">
          {item.cohortName}
        </span>
      )}
      {item.brandName && (
        <span className="truncate text-sm text-gray-500">
          · {item.brandName}
        </span>
      )}
    </div>
  );
}

function MiniButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded border border-gray-300 bg-white px-1.5 text-[11px] font-medium leading-[18px] text-gray-600 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function TokenInputs({
  systemUserToken,
  threadsToken,
  onSystemUserToken,
  onThreadsToken,
}: {
  systemUserToken: string;
  threadsToken: string;
  onSystemUserToken: (value: string) => void;
  onThreadsToken: (value: string) => void;
}) {
  const inputClass =
    "h-[34px] w-full rounded-md border border-gray-300 bg-white px-2.5 font-mono text-xs placeholder:font-sans placeholder:text-gray-400 focus:border-navy-500 focus:outline-none";
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <input
        aria-label="시스템사용자 토큰"
        className={inputClass}
        placeholder="시스템사용자 토큰 (EAA…)"
        value={systemUserToken}
        onChange={(event) => onSystemUserToken(event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <input
        aria-label="쓰레드 토큰"
        className={inputClass}
        placeholder="쓰레드 토큰"
        value={threadsToken}
        onChange={(event) => onThreadsToken(event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

function PendingCard({
  item,
  onChanged,
}: {
  item: MetaSetupItem;
  onChanged: (outcome: Outcome) => void;
}) {
  const [systemUserToken, setSystemUserToken] = useState("");
  const [threadsToken, setThreadsToken] = useState("");
  const [password, setPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(
        () => setCopied((current) => (current === key ? null : current)),
        1500,
      );
    } catch {
      setError("복사하지 못했습니다. 직접 선택해 복사해 주세요.");
    }
  };

  const revealPassword = async () => {
    if (password !== null) return password;
    setError("");
    try {
      const response = await fetch(
        `/api/admin/users/${item.userId}/submission/reveal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field: item.type === "google" ? "MetaGooglePW" : "InstagramPW",
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "비밀번호를 확인할 수 없습니다.");
        return null;
      }
      const value = typeof data.value === "string" ? data.value : "";
      setPassword(value);
      return value;
    } catch {
      setError("비밀번호 확인 중 오류가 발생했습니다.");
      return null;
    }
  };

  const complete = async () => {
    if (busy) return;
    const system = systemUserToken.trim();
    const threads = threadsToken.trim();
    if (!system || !threads) {
      setError("토큰 2개를 모두 입력해 주세요.");
      return;
    }
    const target = item.email
      ? `${item.email}(으)로 토큰 메일을 보냅니다.`
      : "가입 메일이 없어 메일은 보내지 못합니다. 토큰은 교육생 대시보드에서만 보입니다.";
    if (
      !window.confirm(
        `${item.name || "교육생"}님의 Meta 설정을 완료 처리할까요?\n${target}`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const outcome = await completeMetaSetup(item.userId, system, threads);
    setBusy(false);
    // 저장까지 됐으면(메일만 실패해도) 목록을 다시 읽어 완료 탭으로 옮긴다
    if (outcome.ok || outcome.message.startsWith("설정 완료는 저장")) {
      onChanged(outcome);
    } else {
      setError(outcome.message);
    }
  };

  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <NameLine item={item} size="xl" />
        <span className="shrink-0 text-xs text-gray-400">
          {formatAt(item.requestedAt)} · {timeAgo(item.requestedAt)}
        </span>
      </div>

      <div className="mt-2.5 rounded-md bg-gray-50 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.type && (
            <span
              className={`rounded px-1.5 text-xs font-semibold leading-5 ${TYPE_STYLE[item.type]}`}
            >
              {TYPE_LABEL[item.type]}
            </span>
          )}
          {item.loginId && (
            <span className="flex min-w-0 items-center gap-1">
              <b className="truncate text-gray-900">{item.loginId}</b>
              <MiniButton onClick={() => copy("id", item.loginId ?? "")}>
                {copied === "id" ? "복사됨" : "복사"}
              </MiniButton>
            </span>
          )}
          {item.hasPassword && (
            <span className="flex min-w-0 items-center gap-1">
              <b className="truncate text-gray-900">
                {password === null ? "••••••" : password || "-"}
              </b>
              <MiniButton
                onClick={() =>
                  password === null ? revealPassword() : setPassword(null)
                }
              >
                {password === null ? "보기" : "가리기"}
              </MiniButton>
              <MiniButton
                onClick={async () => {
                  const value = await revealPassword();
                  if (value) await copy("pw", value);
                }}
              >
                {copied === "pw" ? "복사됨" : "복사"}
              </MiniButton>
            </span>
          )}
        </div>
        {item.memo && (
          <p className="mt-1 truncate text-xs text-gray-600" title={item.memo}>
            <span className="mr-1 rounded bg-gray-200 px-1 text-[10px] font-semibold text-gray-600">
              메모
            </span>
            {item.memo}
          </p>
        )}
      </div>

      <div className="mt-2.5">
        <TokenInputs
          systemUserToken={systemUserToken}
          threadsToken={threadsToken}
          onSystemUserToken={setSystemUserToken}
          onThreadsToken={setThreadsToken}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-gray-500">
          받는 메일 <b className="text-gray-800">{item.email || "없음"}</b>
        </p>
        <Button
          onClick={complete}
          disabled={busy}
          className="h-9 shrink-0 bg-navy-800 px-4 text-sm font-semibold text-white hover:bg-navy-900"
        >
          {busy ? "처리 중..." : "설정 완료 처리"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </article>
  );
}

function DoneCard({
  item,
  onChanged,
}: {
  item: MetaSetupItem;
  onChanged: (outcome: Outcome) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [systemUserToken, setSystemUserToken] = useState("");
  const [threadsToken, setThreadsToken] = useState("");
  const [busy, setBusy] = useState<"resend" | "replace" | null>(null);
  const [error, setError] = useState("");
  // 마지막 완료 처리 뒤에 메일 기록이 있어야 보낸 것으로 본다
  const mailSent = Boolean(
    item.emailSentAt && item.doneAt && item.emailSentAt >= item.doneAt,
  );

  const run = async (
    kind: "resend" | "replace",
    system: string,
    threads: string,
    question: string,
  ) => {
    if (busy) return;
    if (!window.confirm(question)) return;
    setBusy(kind);
    setError("");
    const outcome = await completeMetaSetup(item.userId, system, threads);
    setBusy(null);
    if (outcome.ok || outcome.message.startsWith("설정 완료는 저장")) {
      setEditing(false);
      onChanged(outcome);
    } else {
      setError(outcome.message);
    }
  };

  const target = item.email || "가입 메일 없음";
  return (
    <article
      className={`min-w-0 rounded-xl border bg-white px-4 py-3 shadow-sm ${mailSent ? "border-gray-200" : "border-red-200"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <NameLine item={item} size="lg" />
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="sm"
            variant={mailSent ? "outline" : "default"}
            disabled={busy !== null}
            onClick={() =>
              run(
                "resend",
                MASKED_SECRET,
                MASKED_SECRET,
                `${item.name || "교육생"}님에게 저장된 토큰으로 메일을 다시 보낼까요?\n받는 주소: ${target}`,
              )
            }
            className={`h-7 px-2 text-xs ${mailSent ? "" : "bg-navy-800 text-white hover:bg-navy-900"}`}
          >
            {busy === "resend" ? "보내는 중..." : "메일 다시"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() => setEditing((current) => !current)}
            className="h-7 px-2 text-xs"
          >
            {editing ? "닫기" : "토큰 바꾸기"}
          </Button>
        </div>
      </div>
      <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-500">
        {mailSent ? (
          <span className="flex shrink-0 items-center gap-0.5 font-semibold text-green-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            메일 발송
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-0.5 font-semibold text-red-600">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            메일 안 나감
          </span>
        )}
        <span className="truncate">
          {mailSent
            ? formatAt(item.emailSentAt)
            : `완료 ${formatAt(item.doneAt)}`}{" "}
          · {target}
          {item.type ? ` · ${TYPE_LABEL[item.type]}` : ""}
        </span>
      </p>
      {editing && (
        <div className="mt-2.5 space-y-2">
          <TokenInputs
            systemUserToken={systemUserToken}
            threadsToken={threadsToken}
            onSystemUserToken={setSystemUserToken}
            onThreadsToken={setThreadsToken}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={busy !== null}
              onClick={() => {
                const system = systemUserToken.trim();
                const threads = threadsToken.trim();
                if (!system || !threads) {
                  setError("토큰 2개를 모두 입력해 주세요.");
                  return;
                }
                run(
                  "replace",
                  system,
                  threads,
                  `${item.name || "교육생"}님의 토큰을 바꾸고 메일을 다시 보낼까요?\n받는 주소: ${target}`,
                );
              }}
              className="h-8 bg-navy-800 px-3 text-xs text-white hover:bg-navy-900"
            >
              {busy === "replace" ? "처리 중..." : "바꾸고 메일 보내기"}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </article>
  );
}

export default function MetaSetupClient() {
  const [stage, setStage] = useState<Stage>("pending");
  const [lists, setLists] = useState<Record<Stage, ListState | null>>({
    pending: null,
    done: null,
  });
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Outcome | null>(null);

  const load = useCallback(async (target: Stage, cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ stage: target });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/admin/meta-setup?${query}`, {
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          body.error || "Meta 설정요청 목록을 불러오지 못했습니다.",
        );
      const items: MetaSetupItem[] = Array.isArray(body.items)
        ? body.items
        : [];
      setLists((current) => ({
        ...current,
        [target]: {
          items: cursor ? [...(current[target]?.items ?? []), ...items] : items,
          nextCursor: body.nextCursor ?? null,
        },
      }));
      if (body.counts) setCounts(body.counts);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Meta 설정요청 목록을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(stage);
  }, [stage, load]);

  const handleChanged = (outcome: Outcome) => {
    setNotice(outcome);
    window.dispatchEvent(new Event(META_SETUP_CHANGED_EVENT));
    load(stage);
  };

  const list = lists[stage];
  const tabs: Array<{ key: Stage; label: string; count?: number }> = [
    { key: "pending", label: "처리 대기", count: counts?.pending },
    { key: "done", label: "완료", count: counts?.done },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-100">
            <Facebook className="h-6 w-6 text-gold-700" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meta 설정요청</h1>
            <p className="text-gray-500">
              교육생 계정으로 Meta 설정을 마친 뒤 토큰 2개를 넣고 완료하면,
              교육생 메일로 토큰이 나갑니다.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => load(stage)}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          새로고침
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Meta 설정요청 상태"
        className="inline-flex rounded-lg bg-gray-100 p-1 text-sm"
      >
        {tabs.map((tab) => {
          const active = stage === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setNotice(null);
                setStage(tab.key);
              }}
              className={
                active
                  ? "rounded-md bg-white px-4 py-2 font-semibold text-gray-900 shadow-sm"
                  : "rounded-md px-4 py-2 font-medium text-gray-600 hover:text-gray-900"
              }
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${
                    tab.key === "pending" && tab.count > 0
                      ? "bg-navy-900 text-white"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`rounded-lg border p-4 text-sm font-medium ${
            notice.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {notice.message}
        </div>
      )}

      {loading && !list ? (
        <div className="flex items-center justify-center gap-2 p-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          불러오는 중...
        </div>
      ) : list && list.items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          {stage === "pending"
            ? "지금 처리할 Meta 설정요청이 없습니다."
            : "아직 완료한 Meta 설정이 없습니다."}
        </p>
      ) : list ? (
        <>
          <div className="grid items-start gap-3 md:grid-cols-2">
            {list.items.map((item) =>
              stage === "pending" ? (
                <PendingCard
                  key={item.userId}
                  item={item}
                  onChanged={handleChanged}
                />
              ) : (
                <DoneCard
                  key={item.userId}
                  item={item}
                  onChanged={handleChanged}
                />
              ),
            )}
          </div>
          {list.nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => load(stage, list.nextCursor ?? undefined)}
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
