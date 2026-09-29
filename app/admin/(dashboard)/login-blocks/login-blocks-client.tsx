"use client";

import { useCallback, useEffect, useState } from "react";
import { LockOpen, RefreshCw, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type BlockUser = { id: string; name: string; phone: string | null; cohortName: string | null };
type Block = { keyHash: string; attempts: number; retryAfterSeconds: number; lastAttemptAt: number; user: BlockUser | null };
type Data = { enabled: boolean; windowMinutes: number; users: Block[]; others: Block[] };

function minutesLeft(seconds: number) {
  return `${Math.max(1, Math.ceil(seconds / 60))}분`;
}

function lastTried(value: number) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "-";
}

export default function LoginBlocksClient() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login-blocks", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "차단 목록을 불러오지 못했습니다.");
      setData(body as Data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "차단 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function release(keyHashes: string[], label: string, id: string) {
    if (!window.confirm(`${label}의 로그인 차단을 해제할까요?\n해제하면 바로 다시 로그인할 수 있습니다.`)) return;
    setReleasing(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/login-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyHashes }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "차단을 해제하지 못했습니다.");
      setNotice(body.cleared > 0 ? `${label}의 로그인 차단을 해제했습니다.` : `${label}은(는) 이미 차단이 풀려 있었습니다.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "차단을 해제하지 못했습니다.");
    } finally {
      setReleasing(null);
    }
  }

  const users = data?.users ?? [];
  const others = data?.others ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center">
            <LockOpen className="w-6 h-6 text-gold-700" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">로그인 차단 해제</h1>
            <p className="text-gray-500">
              비밀번호를 5회 이상 틀려 차단된 회원을 바로 풀어줍니다. 해제하지 않아도 첫 시도부터{" "}
              {data?.windowMinutes ?? 15}분이 지나면 자동으로 풀립니다.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          새로고침
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {notice}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 p-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          불러오는 중...
        </div>
      ) : data && !data.enabled ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          이 환경에서는 로그인 차단 기록이 서버 메모리에만 있어 해제할 수 없습니다. 15분 뒤 자동으로 풀립니다.
        </div>
      ) : data ? (
        <>
          <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="blocked-members">
            <h2 id="blocked-members" className="mb-4 text-lg font-bold text-gray-900">
              차단된 회원 <span className="text-gold-700">{users.length}</span>명
            </h2>
            {users.length === 0 ? (
              <p className="text-gray-500">지금 차단된 회원이 없습니다.</p>
            ) : (
              <ul className="divide-y">
                {users.map((block) => (
                  <li key={block.keyHash} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="min-w-48 flex-1">
                      <div className="font-semibold text-gray-900">
                        {block.user?.name}
                        {block.user?.cohortName && (
                          <span className="ml-2 text-sm font-normal text-gray-500">{block.user.cohortName}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{block.user?.phone ?? "연락처 없음"}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      시도 {block.attempts}회 · 마지막 {lastTried(block.lastAttemptAt)} · 약 {minutesLeft(block.retryAfterSeconds)} 뒤 자동 해제
                    </div>
                    <Button
                      onClick={() => release([block.keyHash], `${block.user?.name ?? "회원"}님`, block.keyHash)}
                      disabled={releasing !== null}
                      className="bg-navy-800 text-white hover:bg-navy-900"
                    >
                      {releasing === block.keyHash ? "해제 중..." : "차단 해제"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {others.length > 0 && (
            <section className="rounded-xl border bg-white p-5 shadow-sm" aria-labelledby="blocked-others">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="blocked-others" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <ShieldAlert className="w-5 h-5 text-orange-500" aria-hidden="true" />
                    회원과 연결되지 않은 차단 {others.length}건
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    같은 네트워크(IP)에서 시도가 너무 많았거나, 가입되지 않은 번호로 시도한 기록입니다. 교육장처럼 여러 명이 같은
                    와이파이를 쓰면 모두 막힐 수 있습니다.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => release(others.map((block) => block.keyHash), `연결되지 않은 차단 ${others.length}건`, "others")}
                  disabled={releasing !== null}
                >
                  {releasing === "others" ? "해제 중..." : "모두 해제"}
                </Button>
              </div>
              <ul className="space-y-1 text-sm text-gray-600">
                {others.map((block) => (
                  <li key={block.keyHash}>
                    시도 {block.attempts}회 · 마지막 {lastTried(block.lastAttemptAt)} · 약 {minutesLeft(block.retryAfterSeconds)} 뒤 자동 해제
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
