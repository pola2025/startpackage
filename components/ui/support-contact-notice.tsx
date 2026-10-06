"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Mail, Palette, Paperclip, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { COMMUNICATION_UPLOAD_MAX_LABEL } from "@/lib/communication/attachments";

const DISMISSED_UNTIL_KEY = "support-contact-notice-dismissed-until-v1";

// 문의 화면이 열리면서 작성창이 해당 카테고리로 바로 뜬다.
const inquiryLinks = [
  {
    label: "디자인 문의하기",
    hint: "시안·로고·인쇄물 관련 질문",
    href: "/dashboard/communication?new=design",
    icon: Palette,
  },
  {
    label: "자료·정보 추가 전달",
    hint: "추가 서류, 바뀐 정보 보내기",
    href: "/dashboard/communication?new=materials",
    icon: Paperclip,
  },
] as const;

// 전화는 디자인 문의를 받는 창구가 아니라서 용도를 함께 적는다.
const contacts = [
  {
    label: "전화",
    value: "010-9897-9834",
    href: "tel:01098979834",
    icon: Phone,
    note: "홈페이지·마케팅 문의 전용",
  },
  {
    label: "메일",
    value: "mkt@polarad.co.kr",
    href: "mailto:mkt@polarad.co.kr",
    icon: Mail,
    note: `${COMMUNICATION_UPLOAD_MAX_LABEL}가 넘는 파일·영상 전달`,
  },
] as const;

export function SupportContactPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) return;
    } catch {
      // 저장소 접근이 제한된 환경에서도 안내는 정상 노출한다.
    }
    let observer: MutationObserver | null = null;
    const openWhenOtherNoticesClose = () => {
      if (!document.querySelector('[role="dialog"]')) {
        observer?.disconnect();
        setIsOpen(true);
        return;
      }

      observer = new MutationObserver(() => {
        if (!document.querySelector('[role="dialog"]')) {
          observer?.disconnect();
          setIsOpen(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    const timer = window.setTimeout(openWhenOtherNoticesClose, 600);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  const handleClose = () => {
    if (hideToday) {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      try {
        localStorage.setItem(DISMISSED_UNTIL_KEY, endOfToday.toISOString());
      } catch {
        // 저장 실패는 팝업을 닫는 동작을 막지 않는다.
      }
    }
    setIsOpen(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setIsOpen(true);
        else handleClose();
      }}
    >
      <DialogContent className="gap-0 overflow-hidden bg-white p-0 sm:max-w-[440px]">
        <div className="bg-navy-900 px-6 py-5 text-white">
          <p className="text-xs font-semibold tracking-[0.14em] text-gold-300">
            POLARAD
          </p>
          <DialogHeader className="mt-1 text-left">
            <DialogTitle className="text-xl text-white">
              문의는 채팅으로 남겨주세요
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70">
              남기신 내용은 담당자에게 바로 전달됩니다. 답변과 진행 기록도
              한곳에 남습니다.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 py-5">
          {inquiryLinks.map((link, index) => {
            const Icon = link.icon;
            const isPrimary = index === 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleClose}
                className={
                  isPrimary
                    ? "flex items-center gap-3 rounded-lg bg-navy-900 px-4 py-3 text-white outline-none hover:bg-navy-800 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                    : "flex items-center gap-3 rounded-lg border border-gold-300 bg-gold-50 px-4 py-3 text-navy-900 outline-none hover:bg-gold-100 focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
                }
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{link.label}</span>
                  <span
                    className={`block text-xs ${isPrimary ? "text-white/70" : "text-gray-500"}`}
                  >
                    {link.hint}
                  </span>
                </span>
                <ChevronRight
                  className="ml-auto h-4 w-4 shrink-0 opacity-60"
                  aria-hidden="true"
                />
              </Link>
            );
          })}

          <p className="text-center">
            <Link
              href="/dashboard/communication"
              onClick={handleClose}
              className="text-xs font-medium text-navy-700 underline underline-offset-2"
            >
              그 밖의 문의 남기기
            </Link>
          </p>

          <dl className="space-y-1.5 border-t border-gray-100 pt-3 text-sm">
            {contacts.map((contact) => {
              const Icon = contact.icon;
              return (
                <div key={contact.label} className="flex items-start gap-2">
                  <dt className="flex w-14 shrink-0 items-center gap-1.5 pt-0.5 text-xs text-gray-500">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {contact.label}
                  </dt>
                  <dd className="min-w-0">
                    <a
                      href={contact.href}
                      className="break-all font-semibold text-navy-700 hover:underline"
                    >
                      {contact.value}
                    </a>
                    <span className="block text-xs text-gray-500">
                      {contact.note}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>

          <label className="flex cursor-pointer items-center gap-2.5 border-t border-gray-100 pt-3">
            <Checkbox
              id="hide-support-contact-today"
              checked={hideToday}
              onCheckedChange={(checked) => setHideToday(checked === true)}
            />
            <Label
              htmlFor="hide-support-contact-today"
              className="cursor-pointer text-sm font-normal text-gray-500"
            >
              오늘 하루 보지 않기
            </Label>
          </label>
        </div>

        <DialogFooter className="px-6 pb-5">
          <Button variant="outline" onClick={handleClose} className="w-full">
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupportContactCard() {
  return (
    <section
      className="mx-3 mb-3 rounded-xl border border-gold-200 bg-gold-50 p-3"
      aria-labelledby="support-contact-title"
    >
      <p id="support-contact-title" className="text-xs font-bold text-navy-900">
        문의·자료 전달
      </p>
      <p className="text-[11px] text-gray-500">
        채팅으로 남기면 담당자에게 바로 전달됩니다.
      </p>

      <div className="mt-2 space-y-1.5">
        {inquiryLinks.map((link, index) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                index === 0
                  ? "flex items-center justify-center gap-1.5 rounded-md bg-navy-900 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                  : "flex items-center justify-center gap-1.5 rounded-md border border-gold-300 bg-white py-1.5 text-xs font-semibold text-navy-900 hover:bg-gold-100"
              }
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </div>

      <dl className="mt-2.5 space-y-1.5 border-t border-gold-200 pt-2 text-[11px]">
        {contacts.map((contact) => (
          <div key={contact.label} className="flex gap-2">
            <dt className="w-12 shrink-0 text-gray-500">{contact.label}</dt>
            <dd className="min-w-0">
              <a
                href={contact.href}
                className="break-all font-semibold text-navy-700 hover:underline"
              >
                {contact.value}
              </a>
              <span className="block text-[10px] text-gray-500">
                {contact.note}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
