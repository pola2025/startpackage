# 관리자 로그인 가이드

## 로그인 정보

### 관리자
- **URL**: http://localhost:3005/admin/login
- **이메일**: mkt@polarad.co.kr
- **비밀번호**: 0102
- **권한**: super (최고 관리자)

### 일반 사용자
- **URL**: http://localhost:3005/login
- **전화번호**: 01098979834
- **비밀번호**: 0102

## 무한 리다이렉트 해결 방법

1. **브라우저 쿠키/캐시 완전 삭제**
   - Ctrl + Shift + Delete
   - "쿠키 및 사이트 데이터" 체크
   - "캐시된 이미지 및 파일" 체크
   - 삭제

2. **새 시크릿 창에서 테스트**
   - Ctrl + Shift + N (Chrome)
   - http://localhost:3005/admin/login 접속
   - 로그인

3. **문제가 계속되면**
   - 개발 서버 재시작
   - 브라우저 완전 종료 후 재시작

## 구현된 기능

1. ✅ 관리자 가입 신청 시스템
   - 페이지: /admin/register
   - 이름, 이메일, 전화번호, 비밀번호 입력
   - 텔레그램 알림 자동 발송

2. ✅ 관리자 로그인
   - 페이지: /admin/login
   - 이메일/비밀번호 인증
   - role 체크 (super, designer, operator)

3. ✅ 가입 신청 관리
   - 페이지: /admin/requests
   - 승인/거부 기능 (super 관리자만)
   - 역할 할당 기능

4. ✅ 일반 사용자/관리자 계정 분리
   - User 테이블: 일반 사용자
   - Admin 테이블: 관리자
   - 완전히 독립적인 인증 시스템
