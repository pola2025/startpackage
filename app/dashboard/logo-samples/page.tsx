"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info, PenTool } from "lucide-react";
import { LOGO_SAMPLES } from "@/lib/content-samples";

export default function LogoSamplesPage() {
  const [industry, setIndustry] = useState("전체");

  const industries = useMemo(() => {
    const c = new Map<string, number>();
    LOGO_SAMPLES.forEach((x) => c.set(x.industry, (c.get(x.industry) || 0) + 1));
    // 건수가 많은 업종을 앞에 둔다. 한두 건짜리가 앞에 오면 고르기 어렵다
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, []);

  const shown =
    industry === "전체"
      ? LOGO_SAMPLES
      : LOGO_SAMPLES.filter((x) => x.industry === industry);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <PenTool className="h-5 w-5 text-gold-600 md:h-6 md:w-6" />
          <Badge className="bg-navy-900 text-white">로고</Badge>
        </div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          로고 제작사례
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          실제로 제작해 납품한 로고 {LOGO_SAMPLES.length}건입니다. 원하시는
          방향을 고르실 때 참고하세요.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-gold-200 bg-gold-50 p-3.5 md:p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-600" />
        <p className="text-xs leading-relaxed text-gray-700 md:text-sm">
          마음에 드는 사례가 있으면 제작요청서의 로고 항목에 그대로 적어 주세요.
          스타일과 색상, 폰트 방향을 잡는 기준이 됩니다. 납품은{" "}
          <b className="text-gray-900">PNG와 SVG 원본, 변형 버전</b>까지
          포함합니다.
        </p>
      </div>

      {/* 업종 필터 */}
      <div className="flex flex-wrap gap-1.5">
        {[["전체", LOGO_SAMPLES.length] as const, ...industries].map(
          ([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setIndustry(name)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                industry === name
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gold-400"
              }`}
            >
              {name} {count}
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((x) => (
          <Card key={x.src} className="overflow-hidden shadow-sm">
            {/* 흰 로고는 흰 판에서 안 보인다. plate 값으로 판 색을 바꾼다 */}
            <div
              className={`flex h-32 items-center justify-center p-5 ${
                x.plate === "dark" ? "bg-navy-900" : "bg-white"
              }`}
            >
              <img
                src={x.src}
                alt={x.brand}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            </div>
            <CardContent className="border-t border-gray-100 p-3">
              <p className="text-sm font-semibold text-gray-900">{x.brand}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                {x.industry} · {x.date}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {x.formats.split(" · ").map((f) => (
                  <span
                    key={f}
                    className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600"
                  >
                    {f}
                  </span>
                ))}
                <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
                  변형 {x.variants}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600 md:text-sm">
          로고 선호 스타일과 색상은 제작요청서에서 입력하실 수 있습니다.
        </p>
        <Button asChild variant="outline" className="border-navy-900">
          <Link href="/dashboard/submission">제작요청서로 이동</Link>
        </Button>
      </div>
    </div>
  );
}
