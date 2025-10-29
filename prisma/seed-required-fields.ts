import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 필수 필드 설정 초기 데이터
 *
 * 각 워크플로우 타입별 필수 입력 필드 정의
 */
const requiredFieldsConfig = [
  // === 로고 ===
  {
    workflowType: "로고",
    fieldName: "brandName",
    fieldLabel: "브랜드명 (한글)",
    fieldReason: "로고에 표시될 브랜드명",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 50,
  },
  {
    workflowType: "로고",
    fieldName: "brandNameEng",
    fieldLabel: "브랜드명 (영문)",
    fieldReason: "로고 영문 버전 제작 시 필요",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 50,
  },
  {
    workflowType: "로고",
    fieldName: "businessField",
    fieldLabel: "사업 분야",
    fieldReason: "로고 컨셉 및 색상 결정에 필요",
    fieldOrder: 3,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 100,
  },
  {
    workflowType: "로고",
    fieldName: "brandKeywords",
    fieldLabel: "브랜드 키워드",
    fieldReason: "로고 디자인 방향성 결정",
    fieldOrder: 4,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 200,
  },

  // === 명함 ===
  {
    workflowType: "명함",
    fieldName: "name",
    fieldLabel: "이름",
    fieldReason: "명함에 표시될 이름",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 20,
  },
  {
    workflowType: "명함",
    fieldName: "position",
    fieldLabel: "직함/직책",
    fieldReason: "명함에 표시될 직함",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 30,
  },
  {
    workflowType: "명함",
    fieldName: "phone",
    fieldLabel: "연락처",
    fieldReason: "명함에 표시될 전화번호",
    fieldOrder: 3,
    validationType: "phone",
  },
  {
    workflowType: "명함",
    fieldName: "email",
    fieldLabel: "이메일",
    fieldReason: "명함에 표시될 이메일 주소",
    fieldOrder: 4,
    validationType: "email",
  },
  {
    workflowType: "명함",
    fieldName: "companyName",
    fieldLabel: "회사명",
    fieldReason: "명함에 표시될 회사명",
    fieldOrder: 5,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 50,
  },
  {
    workflowType: "명함",
    fieldName: "address",
    fieldLabel: "주소",
    fieldReason: "명함에 표시될 회사 주소",
    fieldOrder: 6,
    validationType: "notEmpty",
    minLength: 10,
    maxLength: 200,
  },

  // === 리플렛 ===
  {
    workflowType: "리플렛",
    fieldName: "title",
    fieldLabel: "리플렛 제목",
    fieldReason: "리플렛 표지에 들어갈 제목",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 100,
  },
  {
    workflowType: "리플렛",
    fieldName: "mainContent",
    fieldLabel: "주요 내용",
    fieldReason: "리플렛 내부 콘텐츠",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 50,
    maxLength: 2000,
  },
  {
    workflowType: "리플렛",
    fieldName: "targetAudience",
    fieldLabel: "타겟 고객",
    fieldReason: "디자인 톤앤매너 결정",
    fieldOrder: 3,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 100,
  },
  {
    workflowType: "리플렛",
    fieldName: "contactInfo",
    fieldLabel: "연락처 정보",
    fieldReason: "리플렛 하단 연락처 표시",
    fieldOrder: 4,
    validationType: "notEmpty",
    minLength: 10,
    maxLength: 200,
  },

  // === 패키지 ===
  {
    workflowType: "패키지",
    fieldName: "productName",
    fieldLabel: "제품명",
    fieldReason: "패키지 전면에 표시될 제품명",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 50,
  },
  {
    workflowType: "패키지",
    fieldName: "productDescription",
    fieldLabel: "제품 설명",
    fieldReason: "패키지 후면 제품 설명",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 20,
    maxLength: 500,
  },
  {
    workflowType: "패키지",
    fieldName: "ingredients",
    fieldLabel: "성분/원재료",
    fieldReason: "식품/화장품 패키지 필수 표기 사항",
    fieldOrder: 3,
    validationType: "notEmpty",
    minLength: 10,
    maxLength: 500,
  },
  {
    workflowType: "패키지",
    fieldName: "barcode",
    fieldLabel: "바코드 정보",
    fieldReason: "패키지 바코드 인쇄",
    fieldOrder: 4,
    validationType: "notEmpty",
    minLength: 8,
    maxLength: 20,
  },

  // === 배너 ===
  {
    workflowType: "배너",
    fieldName: "bannerMessage",
    fieldLabel: "배너 메시지",
    fieldReason: "배너에 표시될 핵심 메시지",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 100,
  },
  {
    workflowType: "배너",
    fieldName: "callToAction",
    fieldLabel: "행동 유도 문구 (CTA)",
    fieldReason: "배너 하단 CTA 버튼 문구",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 2,
    maxLength: 30,
  },
  {
    workflowType: "배너",
    fieldName: "bannerSize",
    fieldLabel: "배너 크기 (가로x세로)",
    fieldReason: "배너 제작 사이즈",
    fieldOrder: 3,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 30,
  },
  {
    workflowType: "배너",
    fieldName: "targetUrl",
    fieldLabel: "연결 URL",
    fieldReason: "배너 클릭 시 이동할 페이지",
    fieldOrder: 4,
    validationType: "notEmpty",
    minLength: 10,
    maxLength: 200,
  },

  // === 상세페이지 ===
  {
    workflowType: "상세페이지",
    fieldName: "productTitle",
    fieldLabel: "상품명",
    fieldReason: "상세페이지 상단 상품명",
    fieldOrder: 1,
    validationType: "notEmpty",
    minLength: 5,
    maxLength: 100,
  },
  {
    workflowType: "상세페이지",
    fieldName: "productFeatures",
    fieldLabel: "상품 특징",
    fieldReason: "상품 주요 특징 섹션",
    fieldOrder: 2,
    validationType: "notEmpty",
    minLength: 50,
    maxLength: 1000,
  },
  {
    workflowType: "상세페이지",
    fieldName: "specifications",
    fieldLabel: "상품 스펙",
    fieldReason: "상세 스펙 표시",
    fieldOrder: 3,
    validationType: "notEmpty",
    minLength: 20,
    maxLength: 500,
  },
  {
    workflowType: "상세페이지",
    fieldName: "shippingInfo",
    fieldLabel: "배송 정보",
    fieldReason: "배송 안내 섹션",
    fieldOrder: 4,
    validationType: "notEmpty",
    minLength: 10,
    maxLength: 200,
  },
];

async function seedRequiredFields() {
  console.log("🌱 필수 필드 설정 데이터 시딩 시작...");

  for (const config of requiredFieldsConfig) {
    await prisma.requiredFieldConfig.upsert({
      where: {
        workflowType_fieldName: {
          workflowType: config.workflowType,
          fieldName: config.fieldName,
        },
      },
      update: {
        fieldLabel: config.fieldLabel,
        fieldReason: config.fieldReason,
        fieldOrder: config.fieldOrder,
        validationType: config.validationType,
        minLength: config.minLength,
        maxLength: config.maxLength,
        isActive: true,
      },
      create: config,
    });

    console.log(
      `  ✅ [${config.workflowType}] ${config.fieldLabel} 설정 완료`
    );
  }

  const totalCount = await prisma.requiredFieldConfig.count();
  console.log(`\n✨ 필수 필드 설정 완료! 총 ${totalCount}개 필드`);

  // 워크플로우 타입별 요약
  const summary = await prisma.requiredFieldConfig.groupBy({
    by: ["workflowType"],
    _count: true,
    where: { isActive: true },
  });

  console.log("\n📊 워크플로우 타입별 필수 필드 수:");
  summary.forEach((item) => {
    console.log(`  - ${item.workflowType}: ${item._count}개`);
  });
}

seedRequiredFields()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ 시딩 실패:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
