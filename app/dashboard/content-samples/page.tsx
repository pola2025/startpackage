"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  FileText,
  Film,
  Globe,
  Images,
  Info,
  Mic,
  Palette,
} from "lucide-react";
import {
  BLOG_SAMPLES,
  CAROUSEL_SAMPLES,
  REEL_SAMPLES,
  bodyImage,
  type BlogSample,
} from "@/lib/content-samples";

const DELIVERABLES = [
  { icon: FileText, label: "네이버 블로그", detail: "표지·본문 이미지·인포그래픽 한 세트" },
  { icon: Images, label: "인스타그램 게시글", detail: "표지부터 마무리까지 넘겨보는 카드" },
  { icon: Film, label: "인스타그램 릴스", detail: "자막과 음악까지 얹은 숏폼" },
  { icon: Globe, label: "홈페이지 게시글", detail: "같은 글이 홈페이지에도 함께 올라갑니다" },
];

function MockBadge() {
  return (
    <span className="absolute left-2 top-2 z-10 rounded border border-amber-300 bg-amber-50/95 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
      예시 목업
    </span>
  );
}

export default function ContentSamplesPage() {
  const [post, setPost] = useState<BlogSample | null>(null);
  const [zoom, setZoom] = useState<{ src: string; cap: string } | null>(null);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 머리말 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-5 w-5 text-gold-600 md:h-6 md:w-6" />
          <Badge className="bg-green-600 text-white">콘텐츠 대행</Badge>
        </div>
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          콘텐츠 제작사례
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">
          실제로 발행하고 납품한 콘텐츠입니다. 하루에 어떤 것이 나가는지 형태로
          확인하실 수 있습니다.
        </p>
      </div>

      {/* 하루 발행 구성 */}
      <Card className="border-green-200 bg-green-50/50 shadow-sm">
        <CardContent className="p-4 md:p-5">
          <p className="mb-3 text-xs font-semibold text-gray-500">
            하루에 나가는 콘텐츠
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {DELIVERABLES.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-white p-3"
              >
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <div className="leading-tight">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {label}
                    </span>
                    <span className="text-[11px] font-medium text-green-700">
                      1개 / 일
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-dashed border-green-300 bg-white p-3">
            <Mic className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
            <div className="leading-relaxed">
              <span className="text-sm font-semibold text-gray-900">
                대표님 목소리 적용
              </span>
              <p className="mt-0.5 text-xs text-gray-600">
                릴스 내레이션에 대표님 목소리를 쓰고 싶으시면 한 번 녹취해
                주세요. 이후 콘텐츠에는 그 목소리로 생성해 적용합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 안내 */}
      <div className="flex items-start gap-2.5 rounded-lg border border-gold-200 bg-gold-50 p-3.5 md:p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-600" />
        <p className="text-xs leading-relaxed text-gray-700 md:text-sm">
          여기 보이는 카피와 판형은 기준선입니다.{" "}
          <b className="text-gray-900">
            실제 콘텐츠의 방향과 스타일, 전략은 대표님이 원하시는 컨셉에 맞춰
            다시 잡습니다.
          </b>{" "}
          업종 폭을 보여드리려고 만든 예시에는 <b>예시 목업</b> 배지가 붙어
          있으며 상호는 가상입니다.
        </p>
      </div>

      {/* 사례 */}
      <Tabs defaultValue="blog">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="blog">블로그 {BLOG_SAMPLES.length}</TabsTrigger>
          <TabsTrigger value="carousel">
            인스타 게시글 {CAROUSEL_SAMPLES.length}
          </TabsTrigger>
          <TabsTrigger value="reel">릴스 {REEL_SAMPLES.length}</TabsTrigger>
        </TabsList>

        {/* 블로그 */}
        <TabsContent value="blog" className="mt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {BLOG_SAMPLES.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => x.body && setPost(x)}
                className={`overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition hover:border-gold-400 hover:shadow-sm ${
                  x.body ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="relative aspect-square bg-gray-100">
                  {x.mock && <MockBadge />}
                  <Image
                    src={x.cover}
                    alt={x.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">
                    {x.title}
                  </p>
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    {x.brand} · {x.meta}
                  </p>
                  {x.body && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-gold-600">
                      본문 보기 <ArrowRight className="h-3 w-3" />
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* 인스타 게시글 */}
        <TabsContent value="carousel" className="mt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {CAROUSEL_SAMPLES.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() =>
                  setZoom({ src: x.cover, cap: `${x.brand} · ${x.kind}` })
                }
                className="overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition hover:border-gold-400 hover:shadow-sm"
              >
                {/* 실사례 표지는 1:1·4:5 가 섞여 있다. cover 로 두면 카피가 좌우로 잘린다 */}
                <div className="relative aspect-[4/5] bg-gray-100">
                  {x.mock && <MockBadge />}
                  <Image
                    src={x.cover}
                    alt={x.brand}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-contain"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900">
                    {x.brand}
                  </p>
                  <p className="mt-1 text-[11px] leading-tight text-gray-500">
                    {x.kind}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* 릴스 */}
        <TabsContent value="reel" className="mt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {REEL_SAMPLES.map((x) => (
              <div
                key={x.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                {/* poster 가 없으면 10칸이 전부 검은 박스로 뜬다 */}
                <video
                  src={x.src}
                  poster={`/samples/reel-poster/${x.id}.jpg`}
                  className="aspect-[9/16] w-full bg-black object-cover"
                  controls
                  playsInline
                  preload="none"
                />
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900">
                    {x.brand}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">{x.industry}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600 md:text-sm">
          콘텐츠 대행 조건과 시작 시점은 온라인마케팅 안내에서 확인하실 수
          있습니다.
        </p>
        <Button asChild variant="outline" className="border-navy-900">
          <Link href="/dashboard/online-marketing">온라인마케팅 안내</Link>
        </Button>
      </div>

      {/* 본문 모달 */}
      <Dialog open={!!post} onOpenChange={(o) => !o && setPost(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto p-0">
          {post && (
            <>
              <DialogHeader className="border-b border-gray-200 px-6 py-4 text-left">
                {post.mock && (
                  <span className="mb-1 inline-block w-fit rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    예시 목업
                  </span>
                )}
                <DialogTitle className="text-base leading-snug">
                  {post.title}
                </DialogTitle>
                <p className="text-xs text-gray-500">
                  {post.brand} · {post.date} · {post.meta}
                </p>
              </DialogHeader>

              <div className="px-6 py-5">
                <img
                  src={post.cover}
                  alt={post.title}
                  className="mb-6 w-full rounded-md"
                />
                {post.body?.blocks.map((b, i) => {
                  if (b.t === "h")
                    return (
                      <h3
                        key={i}
                        className="mb-3 mt-8 break-keep text-lg font-bold text-navy-900"
                      >
                        {b.x}
                      </h3>
                    );
                  if (b.t === "p")
                    return (
                      <p
                        key={i}
                        className="mb-4 break-keep text-[15px] leading-[1.9] text-gray-800"
                      >
                        {b.x}
                      </p>
                    );
                  const key = b.t === "info" ? "info" : b.x;
                  return (
                    <img
                      key={i}
                      src={bodyImage(post.id, key)}
                      alt=""
                      loading="lazy"
                      className="my-6 w-full rounded-md"
                    />
                  );
                })}

                {post.body && (
                  <div className="mt-7 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-navy-900">
                      {post.brand} · {post.body.cta.line1}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {post.body.cta.line2}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                <p className="mb-2.5 text-xs font-semibold text-gray-500">
                  이 한 건에 납품되는 자산
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    post.cover,
                    bodyImage(post.id, "b1"),
                    bodyImage(post.id, "info"),
                    bodyImage(post.id, "b2"),
                  ].map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="h-16 w-full rounded object-cover"
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 표지 확대 */}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-md p-0">
          {zoom && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{zoom.cap}</DialogTitle>
              </DialogHeader>
              <img src={zoom.src} alt={zoom.cap} className="w-full" />
              <p className="px-4 pb-4 text-xs text-gray-500">{zoom.cap}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
