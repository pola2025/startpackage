export function isMigrationMaintenance(): boolean {
  return process.env.D1_MIGRATION_MAINTENANCE === "true";
}

export const MIGRATION_MAINTENANCE_MESSAGE =
  "서비스 데이터 이전 작업 중입니다. 입력한 내용을 보관한 뒤 잠시 후 다시 시도해주세요.";
