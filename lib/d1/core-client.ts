import "server-only";

import { callDataService } from "./service-client";

export async function callCore<T>(operation: string, actorId: string, input: Record<string, unknown> = {}): Promise<T> {
  if (!actorId) throw new Error("Authenticated actor is required");
  return callDataService<T>(`core/${operation}`, { ...input, actorId });
}
