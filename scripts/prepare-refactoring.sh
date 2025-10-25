#!/bin/bash
# Phase 0: Preparation Script
# 기획서 V2 - Section 4.1

set -e  # 에러 발생 시 즉시 중단

echo "========================================="
echo "Phase 0: 아키텍처 리팩토링 준비"
echo "========================================="

# 1. 백업 디렉토리 생성
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "✅ 백업 디렉토리 생성: $BACKUP_DIR"

# 2. DB 백업 (PostgreSQL)
echo "📦 DB 백업 중..."
if command -v pg_dump &> /dev/null; then
  pg_dump -U postgres startpackage > "$BACKUP_DIR/db_backup.sql"
  echo "✅ DB 백업 완료: $BACKUP_DIR/db_backup.sql"
else
  echo "⚠️  pg_dump not found, DB 백업 건너뜀"
fi

# 3. 코드 스냅샷 (Git Tag)
echo "🏷️  Git 스냅샷 생성..."
git add -A
git commit -m "chore: snapshot before architecture refactoring" || echo "변경사항 없음"
git tag "snapshot-before-refactoring-$(date +%Y%m%d)" -m "Snapshot before architecture refactoring"
git push --tags
echo "✅ Git 스냅샷 생성 완료"

# 4. 환경 변수 설정
echo "⚙️  Feature Flags 설정..."
if [ ! -f .env.local ]; then
  cp .env .env.local
fi

# Feature Flags OFF (기본값)
cat >> .env.local << EOF

# === Architecture Refactoring Feature Flags ===
# Phase 2: Auth Provider 분리
NEXT_PUBLIC_USE_NEW_PROVIDER=false

# Phase 3: 서버 레이아웃 인증
NEXT_PUBLIC_USE_SERVER_AUTH=false

# Phase 2: 미들웨어 인증
NEXT_PUBLIC_USE_MIDDLEWARE_AUTH=false
EOF

echo "✅ Feature Flags 설정 완료"

# 5. 롤백 스크립트 생성
echo "🔄 롤백 스크립트 생성..."
cat > scripts/rollback-phase.sh << 'ROLLBACK_SCRIPT'
#!/bin/bash
# Rollback Script for Architecture Refactoring

PHASE=$1

case $PHASE in
  1)
    echo "🔄 Phase 1 롤백: DB 스키마"
    psql -U postgres startpackage < backups/*/db_backup.sql
    npx prisma generate
    ;;
  2)
    echo "🔄 Phase 2 롤백: Auth Provider"
    sed -i 's/NEXT_PUBLIC_USE_NEW_PROVIDER=true/NEXT_PUBLIC_USE_NEW_PROVIDER=false/' .env.local
    npm run build
    ;;
  3)
    echo "🔄 Phase 3 롤백: 서버 레이아웃"
    sed -i 's/NEXT_PUBLIC_USE_SERVER_AUTH=true/NEXT_PUBLIC_USE_SERVER_AUTH=false/' .env.local
    npm run build
    ;;
  4)
    echo "🔄 Phase 4 롤백: UI 개선"
    git revert HEAD~3..HEAD --no-edit
    npm run build
    ;;
  all)
    echo "🔄 전체 롤백: 스냅샷으로 복구"
    LATEST_TAG=$(git tag -l "snapshot-before-refactoring-*" | tail -1)
    git checkout "$LATEST_TAG"
    psql -U postgres startpackage < backups/*/db_backup.sql
    npm install
    npm run build
    ;;
  *)
    echo "Usage: ./rollback-phase.sh [1|2|3|4|all]"
    exit 1
    ;;
esac

echo "✅ 롤백 완료"
ROLLBACK_SCRIPT

chmod +x scripts/rollback-phase.sh
echo "✅ 롤백 스크립트 생성 완료: scripts/rollback-phase.sh"

# 6. 모니터링 도구 확인
echo "📊 모니터링 도구 확인..."
if ! grep -q "@sentry/nextjs" package.json; then
  echo "⚠️  Sentry 미설치 - Phase 1에서 설치 예정"
else
  echo "✅ Sentry 설치됨"
fi

# 7. 테스트 실행 (기존 코드 안정성 확인)
echo "🧪 기존 코드 테스트..."
npm run type-check || echo "⚠️  타입 에러 존재 - Phase 1에서 수정 예정"
npm run build || echo "⚠️  빌드 에러 존재 - 확인 필요"

echo ""
echo "========================================="
echo "✅ Phase 0 준비 완료!"
echo "========================================="
echo ""
echo "다음 단계:"
echo "  1. Phase 1 실행: npm run refactor:phase1"
echo "  2. 롤백 (필요시): ./scripts/rollback-phase.sh all"
echo ""
echo "중요 파일:"
echo "  - 백업: $BACKUP_DIR/"
echo "  - 롤백: scripts/rollback-phase.sh"
echo "  - 환경 변수: .env.local"
echo ""
