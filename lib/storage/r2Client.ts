import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 클라이언트 설정
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!, // https://[account-id].r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!; // https://files.yourdomain.com

/**
 * R2에 파일 업로드
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ url: string; key: string }> {
  const key = `${userId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // 공개 URL 생성
  const url = `${PUBLIC_URL}/${key}`;

  return { url, key };
}

/**
 * R2에서 파일의 Signed URL 생성 (다운로드용)
 * @param key 파일 키 (userId/filename)
 * @param expiresIn 유효 시간 (초) - 기본 1시간
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
}

/**
 * 파일명 생성 (중복 방지)
 */
export function generateFileName(
  fieldName: string,
  originalFileName: string
): string {
  const timestamp = Date.now();
  const extension = originalFileName.split(".").pop() || "bin";
  const sanitized = fieldName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${sanitized}_${timestamp}.${extension}`;
}

/**
 * 환경 변수 검증
 */
export function validateR2Config(): void {
  const required = [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing R2 environment variables: ${missing.join(", ")}\n` +
        `Please check your .env file and add the required variables.`
    );
  }
}
