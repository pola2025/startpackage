// Submission 스키마 정의 (Zod)
// Phase 1: Foundation - Schema Validation

import { z } from "zod";

/**
 * Submission 데이터 검증 스키마
 * - API에서 요청 데이터 검증에 사용
 * - 클라이언트 폼 검증에도 사용 가능
 */
export const submissionSchema = z.object({
  // === 필수 제출 항목 ===
  브랜드명: z.string().min(1, "브랜드명을 입력해주세요"),
  업종: z.string().min(1, "업종을 입력해주세요"),
  주소: z.string().min(1, "주소를 입력해주세요"),

  // 파일 URL (상대 경로 또는 완전한 URL)
  사업자등록증URL: z.string().optional(),
  프로필사진URL: z.string().optional(),

  // === 선택 항목 ===
  대표번호: z.string().optional(),
  이메일: z.string().email("유효한 이메일을 입력해주세요").optional(),

  // 로고
  로고URL: z.string().optional(),
  로고선호스타일: z.string().optional(),
  로고선호색상: z.string().optional(),
  로고선호폰트: z.string().optional(),
  로고제작요청사항: z.string().optional(),

  // 명함 (16진수 색상값 검증)
  명함색상: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "16진수 색상값을 입력해주세요 (예: #3B82F6)")
    .optional(),
  명함시안: z.string().optional(),

  // 계약서
  계약서시안: z.string().optional(),

  // 홈페이지 (✅ 누락 필드 추가)
  도메인주소: z.string().optional(),
  홈페이지스타일: z.string().optional(),
  홈페이지컬러컨셉: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "16진수 색상값을 입력해주세요")
    .optional(),
  홈페이지제작방식: z.string().optional(),

  // 도메인 관리 계정 (외부 서비스 제작 시)
  도메인관리사이트: z.string().optional(),
  도메인관리ID: z.string().optional(),
  도메인관리PW: z.string().optional(),

  // 해외결제 카드 (슬랙에서만 확인, 관리자 화면 비노출)
  해외결제카드앞면URL: z.string().optional(),
  해외결제카드뒷면URL: z.string().optional(),
  해외결제카드유효기간: z.string().optional(),
  해외결제카드CVC: z.string().optional(),

  // 계좌 정보
  은행명: z.string().optional(),
  계좌번호: z.string().optional(),
  계좌명의자명: z.string().optional(), // 사업자 대표와 다를 경우 입력

  // SMS 발신 등록용 서류
  대표자신분증URL: z.string().optional(),
  통신서비스이용증명원URL: z.string().optional(),
  신용카드앞면URL: z.string().optional(),
  로고예시디자인URL: z.string().optional(),
  로고예시디자인2URL: z.string().optional(),

  // 배송 정보
  인쇄물받을주소: z.string().optional(),

  // 마케팅 (선택)
  네이버검색광고ID: z.string().optional(),
  네이버검색광고PW: z.string().optional(),
  네이버클라우드ID: z.string().optional(),
  네이버클라우드PW: z.string().optional(),
  InstagramID: z.string().optional(),
  InstagramPW: z.string().optional(),
  GmailID: z.string().optional(),
  GmailPW: z.string().optional(),

  // 제출 완료 상태
  isComplete: z.boolean().optional(),
});

/**
 * 타입 추론
 * - API 요청 바디 타입으로 사용
 */
export type SubmissionInput = z.infer<typeof submissionSchema>;

/**
 * 부분 업데이트용 스키마
 * - PATCH 요청에 사용 (모든 필드 optional)
 */
export const submissionPartialSchema = submissionSchema.partial();

export type SubmissionPartialInput = z.infer<typeof submissionPartialSchema>;

/**
 * 제작요청 시 필수 필드 검증
 */
export const submissionCompleteSchema = z.object({
  브랜드명: z.string().min(1),
  업종: z.string().min(1),
  주소: z.string().min(1),
  사업자등록증URL: z.string().min(1),
  프로필사진URL: z.string().min(1),
});

export type SubmissionCompleteInput = z.infer<typeof submissionCompleteSchema>;
