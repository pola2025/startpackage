import { createHmac } from "node:crypto";

export type EducationRequestMeta = {
  ipAddress: string;
  ipHash: string;
  userAgent: string;
  country: string | null;
  city: string | null;
  path: string;
};

const BOT_PATTERN = /bot|crawler|spider|scrapy|curl|wget|python-requests|httpclient|headlesschrome|playwright|selenium|phantomjs|go-http-client|java\//i;

export function isAutomatedAgent(userAgent: string): boolean {
  return !userAgent || userAgent.length > 1024 || BOT_PATTERN.test(userAgent);
}

export function educationRequestMeta(request: Request): EducationRequestMeta {
  const headerName = process.env.AUTH_TRUSTED_IP_HEADER?.trim().toLowerCase();
  let ipAddress = "127.0.0.1";
  if (headerName) {
    const raw = request.headers.get(headerName)?.split(",")[0]?.trim();
    if (raw && raw.length <= 128) ipAddress = raw;
    else if (process.env.NODE_ENV === "production") throw new Error("Trusted client IP header is missing");
  } else if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_TRUSTED_IP_HEADER is required");
  }
  const secret = process.env.EDUCATION_IP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("EDUCATION_IP_HASH_SECRET is not configured");
  const url = new URL(request.url);
  return {
    ipAddress,
    ipHash: createHmac("sha256", secret).update(ipAddress).digest("hex"),
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 1024),
    country: (request.headers.get("cf-ipcountry") ?? request.headers.get("x-vercel-ip-country"))?.slice(0, 64) ?? null,
    city: (request.headers.get("x-vercel-ip-city") ?? "").slice(0, 128) || null,
    path: url.pathname.slice(0, 512),
  };
}
