# 커스텀 도메인 설정 가이드

> polaai.co.kr 도메인을 Vercel에 연결하는 방법

**도메인**: polaai.co.kr
**작성일**: 2025-10-25

---

## 📋 목차

1. [DNS 설정 (도메인 등록업체)](#1-dns-설정-도메인-등록업체)
2. [Vercel 도메인 연결](#2-vercel-도메인-연결)
3. [SSL 인증서 적용](#3-ssl-인증서-적용)
4. [환경 변수 업데이트](#4-환경-변수-업데이트)
5. [검증](#5-검증)

---

## 1. DNS 설정 (도메인 등록업체)

### 도메인 등록 업체에서 DNS 설정

**예: 가비아, 카페24, Cloudflare, Route53 등**

#### 옵션 1: CNAME 레코드 (추천)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `@` 또는 `polaai.co.kr` | `cname.vercel-dns.com` | 3600 |
| CNAME | `www` | `cname.vercel-dns.com` | 3600 |

#### 옵션 2: A 레코드

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` 또는 `polaai.co.kr` | `76.76.21.21` | 3600 |
| CNAME | `www` | `cname.vercel-dns.com` | 3600 |

**Vercel IP 주소:**
```
76.76.21.21
76.76.21.22
76.76.21.23
```

### 가비아 예시

1. 가비아 로그인 → My가비아 → 도메인 관리
2. DNS 정보 → DNS 관리
3. 레코드 추가:
   ```
   호스트: @
   타입: CNAME
   값/위치: cname.vercel-dns.com
   TTL: 3600

   호스트: www
   타입: CNAME
   값/위치: cname.vercel-dns.com
   TTL: 3600
   ```

### Cloudflare 예시 (DNS만 사용)

1. Cloudflare 로그인 → DNS 설정
2. Add Record:
   ```
   Type: CNAME
   Name: @
   Target: cname.vercel-dns.com
   Proxy status: DNS only (회색 구름)
   TTL: Auto

   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy status: DNS only
   TTL: Auto
   ```

---

## 2. Vercel 도메인 연결

### 방법 1: Vercel CLI

```bash
# 도메인 추가
vercel domains add polaai.co.kr

# www 서브도메인 추가
vercel domains add www.polaai.co.kr

# 도메인 목록 확인
vercel domains ls
```

### 방법 2: Vercel Dashboard

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택 (`startpackage`)
3. Settings > Domains
4. "Add" 클릭
5. 도메인 입력: `polaai.co.kr`
6. "Add" 클릭
7. www 리다이렉트 설정:
   - `www.polaai.co.kr` 추가
   - Redirect to: `polaai.co.kr` 선택

### DNS 설정 확인

**Vercel에서 DNS 상태 확인:**
- ✅ Valid Configuration: DNS가 올바르게 설정됨
- ⚠️ Invalid Configuration: DNS 설정 확인 필요
- 🔄 Pending: DNS 전파 대기 중 (최대 48시간)

---

## 3. SSL 인증서 적용

### 자동 SSL (Let's Encrypt)

**Vercel은 자동으로 SSL 인증서를 발급합니다:**

1. 도메인 추가 후 자동 발급 (약 5분 소요)
2. 상태 확인:
   - Vercel Dashboard > Domains
   - SSL 인증서 아이콘 확인 (🔒)

### 수동 갱신 (필요 시)

```bash
# 도메인 제거 후 재추가
vercel domains rm polaai.co.kr
vercel domains add polaai.co.kr
```

---

## 4. 환경 변수 업데이트

### NEXTAUTH_URL 변경

```bash
# 기존 환경 변수 삭제
vercel env rm NEXTAUTH_URL production

# 새 도메인으로 추가
vercel env add NEXTAUTH_URL production
# 입력: https://polaai.co.kr

# NEXT_PUBLIC_APP_URL 업데이트
vercel env rm NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL production
# 입력: https://polaai.co.kr
```

### 환경 변수 확인

```bash
vercel env ls
```

출력 예시:
```
Environment Variables
  NEXTAUTH_URL           Production  https://polaai.co.kr
  NEXT_PUBLIC_APP_URL    Production  https://polaai.co.kr
  DATABASE_URL           Production  postgresql://...
  ...
```

---

## 5. 검증

### DNS 전파 확인

```bash
# Windows
nslookup polaai.co.kr

# 예상 출력:
# Name:    polaai.co.kr
# Address: 76.76.21.21 (또는 Vercel IP)
```

**온라인 도구:**
- https://dnschecker.org/
- 도메인 입력: `polaai.co.kr`
- 전 세계 DNS 전파 상태 확인

### SSL 인증서 확인

```bash
# SSL 인증서 정보 확인
curl -I https://polaai.co.kr
```

**브라우저에서 확인:**
1. https://polaai.co.kr 접속
2. 주소창 자물쇠 아이콘 클릭
3. 인증서 정보 확인

### 리다이렉트 확인

**HTTP → HTTPS 리다이렉트:**
```bash
curl -I http://polaai.co.kr
# 301 Moved Permanently
# Location: https://polaai.co.kr
```

**www → non-www 리다이렉트:**
```bash
curl -I https://www.polaai.co.kr
# 308 Permanent Redirect
# Location: https://polaai.co.kr
```

---

## 트러블슈팅

### 문제 1: DNS 전파 안됨

**증상:**
```
nslookup polaai.co.kr
서버를 찾을 수 없습니다
```

**해결:**
1. DNS 설정 재확인 (CNAME → `cname.vercel-dns.com`)
2. TTL 시간 확인 (3600초 = 1시간)
3. 최대 48시간 대기
4. 도메인 등록업체 고객센터 문의

### 문제 2: SSL 인증서 발급 실패

**증상:**
```
SSL Certificate Error
```

**해결:**
1. DNS가 올바르게 전파되었는지 확인
2. Vercel Dashboard에서 도메인 제거 후 재추가
3. CAA 레코드 확인 (있다면 Let's Encrypt 허용)

**CAA 레코드 추가 (선택사항):**
```
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"
```

### 문제 3: 도메인 접속 안됨

**증상:**
```
This site can't be reached
```

**체크리스트:**
- [ ] DNS 설정 확인
- [ ] DNS 전파 확인
- [ ] Vercel에서 도메인 연결 확인
- [ ] SSL 인증서 발급 확인

---

## 배포 후 최종 확인

### ✅ 체크리스트

- [ ] https://polaai.co.kr 접속 성공
- [ ] https://www.polaai.co.kr → https://polaai.co.kr 리다이렉트
- [ ] http://polaai.co.kr → https://polaai.co.kr 리다이렉트
- [ ] SSL 인증서 정상 (자물쇠 아이콘 표시)
- [ ] 로그인 페이지 정상 작동
- [ ] API 엔드포인트 정상 작동
- [ ] 이미지 로딩 정상

### 🔍 테스트 URL

```bash
# 메인 페이지
https://polaai.co.kr

# 로그인
https://polaai.co.kr/login

# 회원가입
https://polaai.co.kr/signup

# 관리자 로그인
https://polaai.co.kr/admin/login

# API 헬스체크
https://polaai.co.kr/api/health
```

---

## 도메인 설정 완료 후

### 1. 문서 업데이트

```bash
# README.md 업데이트
# 프로덕션 URL: https://polaai.co.kr
```

### 2. 알림 설정

**Resend 이메일 FROM 주소 변경:**
```bash
# EMAIL_FROM 환경 변수 업데이트
vercel env rm EMAIL_FROM production
vercel env add EMAIL_FROM production
# 입력: noreply@polaai.co.kr
```

**Resend Dashboard에서 도메인 인증:**
1. https://resend.com/domains
2. Add Domain: `polaai.co.kr`
3. DNS 레코드 추가 (SPF, DKIM, DMARC)

### 3. 재배포

```bash
# 환경 변수 변경 후 재배포
vercel --prod
```

---

## 참고 자료

- **Vercel Custom Domains**: https://vercel.com/docs/concepts/projects/domains
- **DNS 설정 가이드**: https://vercel.com/docs/concepts/projects/domains/add-a-domain
- **SSL 인증서**: https://letsencrypt.org/

---

**도메인 설정 완료를 축하합니다! 🎉**

**프로덕션 URL**: https://polaai.co.kr
