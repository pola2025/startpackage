"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText, Palette, Globe, MessageCircle } from "lucide-react";

const STORAGE_KEY = "cohort-announcement-26-3-dismissed";

export function CohortAnnouncementPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hideToday, setHideToday] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const expiry = new Date(dismissed);
      if (expiry > new Date()) return;
    }
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    if (hideToday) {
      const tomorrow = new Date();
      tomorrow.setHours(23, 59, 59, 999);
      localStorage.setItem(STORAGE_KEY, tomorrow.toISOString());
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-[460px] gap-0">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">START PACKAGE</p>
              <DialogTitle className="text-xl font-bold mt-1 text-white">
                26-3기 안내사항
              </DialogTitle>
            </div>
            <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-semibold">
              NEW
            </div>
          </div>
        </div>

        {/* 본문 */}
        <DialogDescription asChild>
          <div className="px-6 py-5 space-y-5">
            {/* 자료제출 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  정보 등록 및 자료 제출
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="inline-flex items-center bg-orange-50 text-orange-700 font-semibold px-2 py-0.5 rounded text-xs mr-1">
                    ~ 4월 13일
                  </span>
                  까지 제출해 주세요
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* 디자인 제작 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">디자인 제작</h3>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="inline-flex items-center bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded text-xs mr-1">
                    4월 13일 이후
                  </span>
                  시안 컨펌 등 진행 예정
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* 홈페이지 제작 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">홈페이지 제작</h3>
                <p className="text-sm text-gray-500 mt-1">
                  로고 및 관련 내용 점검 후
                  <span className="inline-flex items-center bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-xs ml-1">
                    4월 14일~
                  </span>
                  제작 진행
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  준비된 분들부터 개별 연락 후 제작
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* 문의 안내 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">제출 지연 시 안내</h3>
                <p className="text-sm text-gray-500 mt-1">
                  개인사정으로 제출이 늦어지는 경우
                  <br />꼭
                  <span className="inline-flex items-center bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded text-xs mx-1">
                    문의 메시지
                  </span>
                  를 남겨주시기 바랍니다
                </p>
              </div>
            </div>

            {/* 오늘 하루 보지 않기 */}
            <div className="border-t border-gray-100 pt-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  id="hide-cohort-ann"
                  checked={hideToday}
                  onCheckedChange={(checked) =>
                    setHideToday(checked as boolean)
                  }
                />
                <Label
                  htmlFor="hide-cohort-ann"
                  className="text-sm text-gray-500 cursor-pointer font-normal"
                >
                  오늘 하루 보지 않기
                </Label>
              </label>
            </div>
          </div>
        </DialogDescription>

        {/* 하단 버튼 */}
        <DialogFooter className="px-6 pb-5">
          <Button
            onClick={handleClose}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
