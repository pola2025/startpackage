import Image from "next/image";
import { Download, FileText } from "lucide-react";
import {
  attachmentFileName,
  isImageAttachment,
} from "@/lib/communication/attachments";
import { cn } from "@/lib/utils";

/** 메시지 안에서 문서 첨부를 내려받는 링크 */
export function AttachmentFileChip({
  url,
  tone = "light",
}: {
  url: string;
  /** dark: 남색 말풍선(내가 보낸 메시지) 위 */
  tone?: "light" | "dark";
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachmentFileName(url)}
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
        tone === "dark"
          ? "bg-white/20 text-white hover:bg-white/30"
          : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-all">{attachmentFileName(url)}</span>
      <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

/** 보내기 전 첨부 미리보기 칸. 이미지는 썸네일, 문서는 파일명 타일로 보여준다. */
export function AttachmentPreview({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  if (isImageAttachment(url)) {
    return (
      <Image
        src={url}
        alt="첨부"
        width={80}
        height={80}
        className={cn("rounded border object-cover", className)}
        unoptimized
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded border bg-gray-50 p-1 text-center text-[10px] leading-tight text-gray-600",
        className,
      )}
    >
      <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
      <span className="line-clamp-2 break-all">{attachmentFileName(url)}</span>
    </div>
  );
}
