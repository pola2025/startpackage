// 제작요청 Zod 스키마
// Phase 5: Production API

import { z } from "zod";

/**
 * 인쇄물 종류
 */
export const PrintTypeEnum = z.enum(["명함", "명찰", "대봉투", "자문계약서"]);

export type PrintType = z.infer<typeof PrintTypeEnum>;

/**
 * 제작요청 스키마
 */
export const requestPrintSchema = z.object({
  printTypes: z.array(PrintTypeEnum).min(1, "최소 1개 이상의 인쇄물을 선택해주세요"),
});

export type RequestPrintInput = z.infer<typeof requestPrintSchema>;

/**
 * 제작요청 응답 스키마
 */
export const requestPrintResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  workflows: z.array(
    z.object({
      id: z.string(),
      type: PrintTypeEnum,
      status: z.string(),
      자료제출일: z.date().nullable(),
    })
  ),
});

export type RequestPrintResponse = z.infer<typeof requestPrintResponseSchema>;
