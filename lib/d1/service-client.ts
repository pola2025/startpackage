import "server-only";
import { isMigrationMaintenance } from "./maintenance";

export class DataServiceRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "DataServiceRequestError";
  }
}

export async function callDataService<T>(operation: string, input: unknown): Promise<T> {
  if (isMigrationMaintenance()) throw new DataServiceRequestError(503, "Database access paused for migration");
  const endpoint = process.env.D1_DATA_SERVICE_URL;
  const token = process.env.D1_DATA_SERVICE_TOKEN;
  if (!endpoint || !token || token.length < 32) throw new Error("D1 data service is not configured");
  const base = new URL(endpoint);
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new Error("Invalid D1 data service endpoint");
  }
  if (!/^(?:communication\/(?:threads|messages)|(?:auth|core|communication-domain|admin-domain|content-domain|shared-domain|admin-notifications|admin-pages)\/[a-z][a-z0-9-]{0,63})$/.test(operation)) {
    throw new Error("Unknown D1 operation");
  }
  let result: Response;
  try {
    result = await fetch(new URL(`/v1/${operation}`, base), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10_000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw new DataServiceRequestError(503, "Data service unavailable");
  }
  if (!result.ok) {
    // Do not forward upstream diagnostics or credential-bearing request data.
    throw new DataServiceRequestError(result.status, `Data service request failed (${result.status})`);
  }
  return result.json() as Promise<T>;
}
