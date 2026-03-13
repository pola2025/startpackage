# 세션 핸드오프: 디자인 시스템 배경색 규칙 + Option C 프로그레스 링

## 날짜: 2026-03-03

## 프로젝트: startpackage

## 커밋: ef94f9f

---

## 완료된 작업

### 디자인 시스템 전면 적용 (10개 파일)

**배경색 3원칙 적용:**

- white = 기본 (완료, 진행중, 중립)
- terra-50 = 사용자 행동 필요 (대기, 수정요청, 긴급)
- gold-50 gradient = 섹션-레벨 강조 카드만

**Option C 패턴 (자료 제출 현황):**

- 완료 항목: opacity 0.55 + ok-500 SVG 프로그레스 링 (full circle)
- 미완 항목: opacity 1.0 + terra-500 SVG 프로그레스 링 (partial, 25%)
- `app/dashboard/page.tsx`에 구현

**Raw Tailwind → Design Token 100% 전환:**
| Raw Color | → Design Token |
|---|---|
| orange-_ | terra-_ |
| yellow-_ | gold-_ |
| green-_/emerald-_ | ok-_ |
| red-_ | terra-_ |
| purple-_ | terra-_ (피드백) / navy-_ (정보) |
| teal-_ | navy-_ |
| blue-500 | navy-500 |

**이모지 → Lucide SVG 통일:**

- status/page.tsx: 8개 이모지 → Palette, Globe, CreditCard, Tag, Mail, FileText, BookOpen, Package
- workflows/page.tsx: 4개 이모지 (📦, ⚠️) 제거
- dashboard/page.tsx: 🎉 제거

**동적 클래스 제거:**

- `bg-${item.color}-100` → 명시적 iconBg/iconColor 속성으로 교체 (마케팅 지원 항목)

## 수정된 파일 (10개)

1. `app/dashboard/page.tsx` — Option C + 배경색 + 토큰 + 이모지
2. `app/dashboard/status/page.tsx` — 이모지→SVG + teal→navy + orange→terra
3. `app/dashboard/workflows/page.tsx` — 이모지 제거 + 전체 토큰 치환
4. `app/admin/(dashboard)/workflows/workflows-client.tsx` — 테이블 행/stat 카드 토큰
5. `app/admin/(dashboard)/workflows/urgent-alert-banner.tsx` — 3색 그라디언트→terra 단색
6. `app/admin/(dashboard)/workflows/urgent-alert-modal.tsx` — green→ok, orange→terra
7. `components/ui/status-timeline.tsx` — warning 카드 orange→terra
8. `components/ui/submission-progress.tsx` — yellow→gold, green→ok
9. `app/components/workflows/kanban-card.tsx` — yellow/purple→terra, blue→navy
10. `app/admin/(dashboard)/workflows/workflow-progress.tsx` — emerald→ok, red/orange→terra

## 검증 결과

- [x] `npm run build` 성공
- [x] `npm run lint` 통과 (기존 warning만)
- [x] raw color grep = 0건 (10개 파일)
- [x] 이모지 grep = 0건 (대상 3개 파일)
- [x] git push origin master → Vercel 자동 배포

## 미완료 / 후속 작업

- [ ] 시각 검증: `/dashboard` Option C 프로그레스 링 + opacity 실물 확인
- [ ] 시각 검증: `/dashboard/status` Lucide SVG 아이콘 표시 확인
- [ ] 시각 검증: `/admin/workflows` 행동필요 행만 terra-50, 나머지 white 확인
- [ ] tailwind.config.ts에 terra-100 값 추가 검토 (현재 50, 500, 600만 정의)
- [ ] 프로젝트 전체 raw color 잔존 스캔 (이번 세션은 10개 파일만 대상)

## 배포 상태

- 커밋: ef94f9f
- 배포: git push → Vercel 자동 배포 (진행중)
