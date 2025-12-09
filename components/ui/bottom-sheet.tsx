"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe",
          className
        )}
      >
        {(title || description) && (
          <SheetHeader className="pb-4">
            {title && <SheetTitle>{title}</SheetTitle>}
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}

// 드래그 핸들이 있는 바텀시트
interface DraggableBottomSheetProps extends BottomSheetProps {
  showDragHandle?: boolean;
}

export function DraggableBottomSheet({
  showDragHandle = true,
  children,
  className,
  ...props
}: DraggableBottomSheetProps) {
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe pt-2",
          className
        )}
      >
        {showDragHandle && (
          <div className="flex justify-center pb-4">
            <div className="w-12 h-1.5 rounded-full bg-gray-300" />
          </div>
        )}
        {(props.title || props.description) && (
          <SheetHeader className="pb-4">
            {props.title && <SheetTitle>{props.title}</SheetTitle>}
            {props.description && (
              <SheetDescription>{props.description}</SheetDescription>
            )}
          </SheetHeader>
        )}
        {children}
      </SheetContent>
    </Sheet>
  );
}
