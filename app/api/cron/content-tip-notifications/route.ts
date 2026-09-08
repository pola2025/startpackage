import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isD1RuntimeEnabled } from "@/lib/d1/runtime";
import { isMigrationMaintenance } from "@/lib/d1/maintenance";
import { callDataService } from "@/lib/d1/service-client";
import { sendContentTipNotifications } from "@/lib/notification/contentTipEmail";
import { randomUUID } from "node:crypto";

function hasCronSecret(request: Request): boolean {
  const configured = process.env.CRON_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || !provided) return false;
  const expected = Buffer.from(configured);
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function run(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  if (!hasCronSecret(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isD1RuntimeEnabled() || isMigrationMaintenance()) return NextResponse.json({ skipped: true, processed: 0 });

  const fanouts = await callDataService<{ items: Array<Record<string, unknown>> }>("shared-domain/scheduled-notification-incomplete", { now: Date.now() });
  let processed = 0;
  for (const item of fanouts.items) {
    const id = typeof item.fanoutKey === "string" ? item.fanoutKey : "";
    if (!id || typeof item.title !== "string" || typeof item.description !== "string" || typeof item.linkType !== "string" || typeof item.linkUrl !== "string") continue;
    const leaseToken = randomUUID();
    try {
      await callDataService("shared-domain/scheduled-notification-claim", { fanoutKey: id, leaseToken });
      await sendContentTipNotifications({ id, title: item.title, description: item.description, linkType: item.linkType, linkUrl: item.linkUrl }, { leaseToken });
      processed += 1;
    } catch (error) {
      console.error("콘텐츠 팁 fanout 재개 실패:", error);
      try {
        await callDataService("shared-domain/scheduled-notification-release", { fanoutKey: id, leaseToken });
      } catch (releaseError) {
        console.error("콘텐츠 팁 fanout lease 해제 실패:", releaseError);
      }
    }
  }
  return NextResponse.json({ processed, candidates: fanouts.items.length });
}

export const GET = run;
export const POST = run;
