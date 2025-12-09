import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

/**
 * Google Drive Service Account 인증 및 API 클라이언트
 *
 * 환경변수 필요:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: 서비스 계정 이메일
 * - GOOGLE_PRIVATE_KEY: 서비스 계정 비공개 키
 * - GOOGLE_DRIVE_ROOT_FOLDER_ID: 루트 폴더 ID
 */

// Google Drive API 클라이언트 생성
export function getDriveService(): drive_v3.Drive {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

// 폴더 찾기 또는 생성
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const parent = parentFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  // 기존 폴더 검색
  const response = await drive.files.list({
    q: `name='${folderName}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // 폴더 생성
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent],
    },
    fields: "id",
  });

  return folder.data.id!;
}

// 파일 업로드
// 주의: 서비스 계정은 자체 저장소가 없으므로 업로드 후 소유권 이전 필요
export async function uploadFileToDrive(
  drive: drive_v3.Drive,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId: string,
  ownerEmail?: string // 소유권 이전할 이메일 (선택)
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  // 파일 업로드
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  const fileId = file.data.id!;

  // 소유권 이전 (ownerEmail이 제공된 경우)
  if (ownerEmail) {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: "owner",
          type: "user",
          emailAddress: ownerEmail,
        },
        transferOwnership: true,
        supportsAllDrives: true,
      });
    } catch (error) {
      console.warn("소유권 이전 실패 (무시):", error);
    }
  }

  // 링크 공유 설정 (링크가 있는 모든 사용자가 볼 수 있음)
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  return {
    id: fileId,
    webViewLink: file.data.webViewLink || "",
    webContentLink: file.data.webContentLink || "",
  };
}

// 파일 삭제
export async function deleteFileFromDrive(
  drive: drive_v3.Drive,
  fileId: string
): Promise<void> {
  await drive.files.delete({ fileId });
}

// 폴더 내 파일 목록 조회
export async function listFilesInFolder(
  drive: drive_v3.Drive,
  folderId: string
): Promise<{ id: string; name: string; webViewLink: string }[]> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, webViewLink, mimeType, createdTime)",
    orderBy: "createdTime desc",
  });

  return (
    response.data.files?.map((file) => ({
      id: file.id!,
      name: file.name!,
      webViewLink: file.webViewLink || "",
    })) || []
  );
}

// MIME 타입 헬퍼
export const MIME_TYPES = {
  // Adobe
  AI: "application/illustrator",
  PSD: "image/vnd.adobe.photoshop",
  PDF: "application/pdf",

  // Images
  PNG: "image/png",
  JPG: "image/jpeg",
  JPEG: "image/jpeg",
  GIF: "image/gif",
  WEBP: "image/webp",
  SVG: "image/svg+xml",

  // Documents
  DOC: "application/msword",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Archive
  ZIP: "application/zip",
} as const;

// 파일 확장자로 MIME 타입 추론
export function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase() || "";
  return MIME_TYPES[ext as keyof typeof MIME_TYPES] || "application/octet-stream";
}
