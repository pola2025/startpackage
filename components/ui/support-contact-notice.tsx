"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
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

const DISMISSED_UNTIL_KEY = "support-contact-notice-dismissed-until-v1";

const contacts = [
  {
    label: "카카오톡",
    value: "polarad",
    icon: MessageCircle,
  },
  {
    label: "전화",
    value: "010-9897-9834",
    href: "tel:01098979834",
    icon: Phone,
  },
  {
    label: "메일",
    value: "mkt@polarad.co.kr",
    href: "mailto:mkt@polarad.co.kr",
    icon: Mail,
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
              진행 관련 문의 안내
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70">
              제작 일정과 진행 상황은 아래 연락처로 문의해 주세요.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-6 py-5">
          {contacts.map((contact) => {
            const Icon = contact.icon;
            const content = (
              <div className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-gray-500">
                    {contact.label}
                  </span>
                  <span className="block break-all text-sm font-semibold text-gray-900">
                    {contact.value}
                  </span>
                </span>
              </div>
            );

            return "href" in contact ? (
              <a
                key={contact.label}
                href={contact.href}
                className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2"
              >
                {content}
              </a>
            ) : (
              <div key={contact.label}>{content}</div>
            );
          })}

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

        <DialogFooter className="gap-2 px-6 pb-5 sm:space-x-0">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            닫기
          </Button>
          <Button asChild className="flex-1 bg-navy-900 hover:bg-navy-800">
            <Link href="/dashboard/communication" onClick={handleClose}>
              문의 작성하기
            </Link>
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
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-900 text-white">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div>
          <p id="support-contact-title" className="text-xs font-bold text-navy-900">
            진행 관련 문의
          </p>
          <p className="text-[11px] text-gray-500">폴라애드</p>
        </div>
      </div>
      <dl className="space-y-1.5 text-[11px]">
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-gray-500">카카오톡</dt>
          <dd className="font-semibold text-gray-900">polarad</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-gray-500">전화</dt>
          <dd>
            <a href="tel:01098979834" className="font-semibold text-navy-700 hover:underline">
              010-9897-9834
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-gray-500">메일</dt>
          <dd className="min-w-0">
            <a
              href="mailto:mkt@polarad.co.kr"
              className="break-all font-semibold text-navy-700 hover:underline"
            >
              mkt@polarad.co.kr
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
