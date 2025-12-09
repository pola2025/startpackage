/**
 * Google Drive API 연동 테스트 스크립트
 * 실행: npx tsx scripts/test-google-drive.ts
 */

import { config } from "dotenv";
config(); // .env 파일 로드

import {
  getDriveService,
  findOrCreateFolder,
  uploadFileToDrive,
  listFilesInFolder,
} from "../lib/google-drive";

async function testGoogleDrive() {
  console.log("🚀 Google Drive API 테스트 시작\n");

  // 1. 환경변수 확인
  console.log("1️⃣ 환경변수 확인");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!email || !key || !folderId) {
    console.error("❌ 환경변수가 설정되지 않았습니다:");
    if (!email) console.error("   - GOOGLE_SERVICE_ACCOUNT_EMAIL");
    if (!key) console.error("   - GOOGLE_PRIVATE_KEY");
    if (!folderId) console.error("   - GOOGLE_DRIVE_ROOT_FOLDER_ID");
    process.exit(1);
  }

  console.log(`   ✅ 서비스 계정: ${email}`);
  console.log(`   ✅ 루트 폴더 ID: ${folderId}`);
  console.log("");

  try {
    // 2. Drive 서비스 초기화
    console.log("2️⃣ Drive 서비스 초기화");
    const drive = getDriveService();
    console.log("   ✅ 서비스 초기화 성공\n");

    // 3. 루트 폴더 접근 테스트
    console.log("3️⃣ 루트 폴더 접근 테스트");
    const files = await listFilesInFolder(drive, folderId);
    console.log(`   ✅ 루트 폴더 접근 성공 (파일 ${files.length}개)\n`);

    // 4. 테스트 폴더 생성
    console.log("4️⃣ 테스트 폴더 생성");
    const testFolderName = `테스트_${new Date().toISOString().split("T")[0]}`;
    const testFolderId = await findOrCreateFolder(drive, testFolderName);
    console.log(`   ✅ 폴더 생성 성공: ${testFolderName}`);
    console.log(`   📁 폴더 ID: ${testFolderId}\n`);

    // 5. 테스트 파일 업로드 (루트 폴더에 직접 업로드)
    console.log("5️⃣ 테스트 파일 업로드");
    const testContent = `Google Drive API 테스트\n생성일: ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testContent, "utf-8");

    // 소유권 이전을 위한 이메일 (폴더 소유자 이메일)
    const ownerEmail = "imagine20002@gmail.com"; // 폴더 소유자 이메일로 변경 필요

    const uploadedFile = await uploadFileToDrive(
      drive,
      "test-file.txt",
      testBuffer,
      "text/plain",
      folderId,
      ownerEmail
    );

    console.log(`   ✅ 파일 업로드 성공`);
    console.log(`   📄 파일 ID: ${uploadedFile.id}`);
    console.log(`   🔗 보기 링크: ${uploadedFile.webViewLink}`);
    console.log(`   ⬇️ 다운로드 링크: ${uploadedFile.webContentLink}\n`);

    // 6. 결과
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 모든 테스트 통과!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("📂 Google Drive에서 확인하세요:");
    console.log(`   https://drive.google.com/drive/folders/${folderId}`);

  } catch (error) {
    console.error("\n❌ 테스트 실패:");
    console.error(error);
    process.exit(1);
  }
}

testGoogleDrive();
