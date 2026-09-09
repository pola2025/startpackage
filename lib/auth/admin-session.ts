export type AdminSessionState = {
  role: string;
  updatedAt: number;
};

export function hasAdminAccess(user: { id?: string; role?: string } | null | undefined): boolean {
  return Boolean(user?.id && user.role && ["super", "designer", "operator"].includes(user.role));
}

export function isAdminSessionCurrent(
  tokenUpdatedAt: number | undefined,
  state: AdminSessionState | null,
) {
  return state !== null && tokenUpdatedAt !== undefined && tokenUpdatedAt === state.updatedAt;
}
