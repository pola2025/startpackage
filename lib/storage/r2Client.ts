import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
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
  userId: string,
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
  expiresIn: number = 3600,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
}

/**
 * R2 직접 업로드용 Signed URL 생성 (브라우저 → R2 직접 PUT)
 * - Vercel 함수 body 제한(4.5MB) 우회용
 * - 브라우저는 이 URL로 PUT 요청 (Content-Type 헤더 필수, R2 CORS 허용 필요)
 * @param key 저장할 키
 * @param contentType 파일 MIME 타입 (서명에 포함되므로 PUT 시 동일 헤더 전송 필수)
 * @param expiresIn 유효 시간 (초) - 기본 5분
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * R2 객체를 버퍼로 읽기 (서버에서 원본 재처리용)
 * @param key 파일 키
 */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * 파일명 생성 (중복 방지)
 */
export function generateFileName(
  fieldName: string,
  originalFileName: string,
): string {
  const timestamp = Date.now();
  const extension = originalFileName.split(".").pop() || "bin";
  const sanitized = fieldName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${sanitized}_${timestamp}.${extension}`;
}

/**
 * R2에서 단일 파일 삭제
 * @param key 파일 키 (userId/filename) 또는 전체 URL
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    // URL에서 키 추출 (PUBLIC_URL이 포함되어 있으면)
    let fileKey = key;
    if (key.startsWith(PUBLIC_URL)) {
      fileKey = key.replace(`${PUBLIC_URL}/`, "");
    } else if (key.startsWith("http")) {
      // 다른 형태의 URL이면 파싱
      const url = new URL(key);
      fileKey = url.pathname.substring(1); // 앞의 / 제거
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    await r2Client.send(command);
    console.log(`✅ R2 파일 삭제 성공: ${fileKey}`);
  } catch (error) {
    console.error(`❌ R2 파일 삭제 실패: ${key}`, error);
    // 파일이 없어도 에러를 throw하지 않음 (이미 삭제된 경우)
  }
}

/**
 * R2에서 여러 파일 일괄 삭제
 * @param keys 파일 키 배열
 */
export async function deleteMultipleFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    // URL에서 키 추출
    const fileKeys = keys
      .map((key) => {
        if (key.startsWith(PUBLIC_URL)) {
          return key.replace(`${PUBLIC_URL}/`, "");
        } else if (key.startsWith("http")) {
          const url = new URL(key);
          return url.pathname.substring(1);
        }
        return key;
      })
      .filter(Boolean);

    if (fileKeys.length === 0) return;

    // 최대 1000개씩 삭제 (S3 제한)
    const chunks = [];
    for (let i = 0; i < fileKeys.length; i += 1000) {
      chunks.push(fileKeys.slice(i, i + 1000));
    }

    for (const chunk of chunks) {
      const command = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
        },
      });

      await r2Client.send(command);
      console.log(`✅ R2 파일 일괄 삭제 성공: ${chunk.length}개`);
    }
  } catch (error) {
    console.error("❌ R2 파일 일괄 삭제 실패:", error);
  }
}

/**
 * 사용자의 모든 파일 삭제
 * @param userId 사용자 ID
 */
export async function deleteUserFilesFromR2(userId: string): Promise<void> {
  // R2 API를 사용하여 userId 폴더의 모든 파일을 나열하고 삭제하는 것은 복잡함
  // 대신 DB에서 파일 URL을 가져와서 삭제하는 방식을 사용
  console.log(`🗑️ 사용자 ${userId}의 파일 삭제 시작`);
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
        `Please check your .env file and add the required variables.`,
    );
  }
}
