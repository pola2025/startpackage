export type AdminSessionState = {
  role: string;
  updatedAt: number;
};

export function isAdminSessionCurrent(
  tokenUpdatedAt: number | undefined,
  state: AdminSessionState | null,
) {
  return state !== null && tokenUpdatedAt !== undefined && tokenUpdatedAt === state.updatedAt;
}
