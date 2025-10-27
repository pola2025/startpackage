# Cloudflare R2 설정 가이드

## 📦 Cloudflare R2란?

- AWS S3 호환 객체 스토리지
- **전송 비용 무료** (가장 큰 장점!)
- 10GB 무료 저장 공간
- 전 세계 310+ 도시 CDN

---

## 🚀 Step 1: Cloudflare 계정 생성

1. https://cloudflare.com 접속
2. "Sign Up" 클릭
3. 이메일 인증 완료

---

## 🪣 Step 2: R2 버킷 생성

### 1. R2 대시보드 접속
1. Cloudflare 대시보드 로그인
2. 좌측 메뉴에서 **"R2"** 클릭
3. "Purchase R2" 클릭 (무료 플랜 선택 가능)

### 2. 버킷 생성
1. "Create bucket" 클릭
2. **버킷 이름**: `startpackage-files` (또는 원하는 이름)
3. **Location**: Automatic (자동 최적 지역 선택)
4. "Create bucket" 클릭

---

## 🔑 Step 3: API 토큰 발급

### 1. API 토큰 생성
1. R2 대시보드에서 "Manage R2 API Tokens" 클릭
2. "Create API token" 클릭
3. **Token name**: `startpackage-upload-token`
4. **Permissions**:
   - ✅ Object Read & Write
   - ✅ Edit
5. **TTL**: Never expires (또는 원하는 기간)
6. "Create API Token" 클릭

### 2. 토큰 정보 복사
다음 정보를 **안전하게 저장**하세요 (한 번만 표시됨):

```
Access Key ID: xxxxxxxxxxxxxxxxxxxx
Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### 3. 계정 ID 확인
R2 대시보드 우측 상단에 표시된 **Account ID**를 복사하세요.

예시: `abc123def456`

---

## 🌐 Step 4: 공개 도메인 설정 (선택사항)

### Option A: Cloudflare 무료 도메인 사용

1. 버킷 설정에서 "Settings" 탭 클릭
2. "Public Access" 섹션에서 "Allow Access" 활성화
3. **R2.dev 하위 도메인** 자동 생성:
   ```
   https://pub-xxxxxxxxxxxxx.r2.dev
   ```
4. 이 URL을 `R2_PUBLIC_URL`로 사용

### Option B: 커스텀 도메인 연결 (권장)

1. Cloudflare에 도메인 등록 (예: `yourdomain.com`)
2. 버킷 설정에서 "Settings" > "Custom Domains" 클릭
3. "Connect Domain" 클릭
4. 서브도메인 입력: `files.yourdomain.com`
5. DNS 레코드 자동 생성 확인
6. `https://files.yourdomain.com` 을 `R2_PUBLIC_URL`로 사용

---

## 🔧 Step 5: 환경 변수 설정

`.env` 파일에 다음 내용을 추가하세요:

```env
# Cloudflare R2 Storage
R2_ENDPOINT="https://[account-id].r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your-access-key-id"
R2_SECRET_ACCESS_KEY="your-secret-access-key"
R2_BUCKET_NAME="startpackage-files"
R2_PUBLIC_URL="https://pub-xxxxxxxxxxxxx.r2.dev"
```

### 예시:
```env
R2_ENDPOINT="https://abc123def456.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="1234567890abcdef1234567890abcdef"
R2_SECRET_ACCESS_KEY="1234567890abcdef1234567890abcdef1234567890abcdef"
R2_BUCKET_NAME="startpackage-files"
R2_PUBLIC_URL="https://pub-1234567890abcdef.r2.dev"
```

---

## ✅ Step 6: 테스트

### 1. 로컬 테스트
```bash
npm run dev
```

### 2. 파일 업로드 시도
1. http://localhost:3005/dashboard/submission 접속
2. 사업자 등록증 업로드
3. 콘솔에서 R2 업로드 로그 확인

### 3. 업로드 확인
1. Cloudflare R2 대시보드에서 버킷 클릭
2. 업로드된 파일 확인:
   ```
   [userId]/사업자등록증URL_1234567890.pdf
   ```

---

## 🔒 보안 설정 (선택사항)

### CORS 설정
버킷이 브라우저에서 직접 접근 가능하도록 CORS 설정:

1. 버킷 설정 > "CORS policy" 클릭
2. 다음 JSON 추가:

```json
[
  {
    "AllowedOrigins": [
      "https://yourdomain.com",
      "http://localhost:3005"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 💰 비용 계산

### 무료 플랜
- **저장**: 10GB 무료
- **전송**: 무료 (무제한!)
- **요청**:
  - 100만 Class A (쓰기) 무료
  - 1000만 Class B (읽기) 무료

### 사용량 예상 (100명 사용자)
```
저장: 5GB (10GB 무료 이내)
전송: 무제한 (무료!)
월 비용: $0
```

---

## 🆘 문제 해결

### 오류: "AccessDenied"
→ API 토큰 권한 확인 (Object Read & Write 필요)

### 오류: "NoSuchBucket"
→ 버킷 이름 확인 (R2_BUCKET_NAME)

### 오류: "NetworkingError"
→ R2_ENDPOINT의 Account ID 확인

### 파일이 보이지 않음
→ R2_PUBLIC_URL 설정 확인 및 Public Access 활성화

---

## 📞 지원

- Cloudflare 문서: https://developers.cloudflare.com/r2/
- Cloudflare 커뮤니티: https://community.cloudflare.com/

---

설정 완료 후 개발 서버를 재시작하세요!

```bash
npm run dev
```
