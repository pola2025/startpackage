import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceFiles = [];
const reviewedRoutePaths = [
  "app/api/admin/ad-automation/[userId]/payment/route.ts",
  "app/api/admin/ad-automation/[userId]/settings/route.ts",
  "app/api/admin/ad-automation/[userId]/toggle/route.ts",
  "app/api/admin/admins/create/route.ts",
  "app/api/admin/admins/reset-2fa/route.ts",
  "app/api/admin/register/route.ts",
  "app/api/admin/requests/route.ts",
  "app/api/admin/workflows/[workflowId]/design-history/route.ts",
  "app/api/homepage/route.ts",
  "app/api/submission/request-print/route.ts",
];
const categories = { runtimeCandidates: [], guardedCandidates: [], typeOnlyOrComments: [], legacyOrInfrastructure: [] };
const relative = (filename) => path.relative(root, filename).replaceAll("\\", "/");
const isSource = (name) => /\.[cm]?[jt]sx?$/.test(name) && !/\.test\./.test(name);
const prismaPattern = /from\s+["'][^"']*(?:lib\/prisma|@prisma\/client)["']|\bprisma\s*\./;
const typeOnlyPattern = /import\s+type\b|import\(["']@prisma\/client["']\)\.[A-Za-z]+/;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "d1") continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else if (isSource(entry.name)) sourceFiles.push(filename);
  }
}
await scan(path.join(root, "app"));
await scan(path.join(root, "lib"));
sourceFiles.push(path.join(root, "auth.ts"));
for (const filename of sourceFiles) {
  const content = await readFile(filename, "utf8");
  const code = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
  if (!prismaPattern.test(code)) {
    if (prismaPattern.test(content)) categories.typeOnlyOrComments.push(relative(filename));
    continue;
  }
  const file = relative(filename);
  if (["lib/prisma.ts", "lib/auth.ts"].includes(file)) categories.legacyOrInfrastructure.push(file);
  else if (typeOnlyPattern.test(code) && !/\bprisma\s*\./.test(code)) categories.typeOnlyOrComments.push(file);
  else if (/isD1RuntimeEnabled\(\)/.test(content)) categories.guardedCandidates.push(file);
  else categories.runtimeCandidates.push(file);
}
const reviewManifestPath = path.join(root, "scripts", "d1-runtime-reachability-review.json");
const reviewManifest = JSON.parse(await readFile(reviewManifestPath, "utf8"));
if (reviewManifest.hashNormalization !== "lf") throw new Error("Review manifest must declare LF-normalized source hashes");
const reviewedReachability = reviewManifest.reviewedFiles ?? [];
const manifestByFile = new Map(reviewedReachability.map((entry) => [entry.file, entry]));
const expectedReachabilityFiles = [...new Set([...categories.runtimeCandidates, ...categories.guardedCandidates])].sort();
const manifestMissingFiles = expectedReachabilityFiles.filter((file) => !manifestByFile.has(file));
const currentHashes = new Map();
for (const file of expectedReachabilityFiles) {
  const content = (await readFile(path.join(root, file), "utf8")).replace(/\r\n/g, "\n");
  currentHashes.set(file, createHash("sha256").update(content).digest("hex"));
}
const staleFiles = expectedReachabilityFiles.filter((file) => currentHashes.get(file) !== manifestByFile.get(file)?.sha256);
const invalidReviewFiles = expectedReachabilityFiles.filter((file) => !["d1-guard-before-runtime-prisma", "reviewed-route-test-covered"].includes(manifestByFile.get(file)?.classification));
const reachabilityBlockers = [...new Set([...categories.runtimeCandidates, ...manifestMissingFiles, ...staleFiles, ...invalidReviewFiles])].sort();
const report = {
  runtimeReady: reachabilityBlockers.length === 0,
  productionCutoverAllowed: false,
  operationQa: Boolean(reviewManifest.operationQa),
  categories,
  reviewedReachability,
  expectedReachabilityFiles,
  manifestMissingFiles,
  staleFiles,
  invalidReviewFiles,
  reachabilityBlockers,
  unverifiedRuntimeFiles: reachabilityBlockers,
  reason: reachabilityBlockers.length ? "The review manifest is missing, stale, invalid, or contains a Prisma-reachable candidate. D1 runtime readiness is not asserted." : "Reviewed manifest matches all scanned Prisma reachability files; operation QA, final parity, write-freeze, and deployment gates remain separate.",
};
const output = path.join(root, ".omx", "d1-migration");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "cutover-gate.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runtimeReady: report.runtimeReady, runtimeCandidates: categories.runtimeCandidates.length, guardedCandidates: categories.guardedCandidates.length, manifestMissingFiles: manifestMissingFiles.length, staleFiles: staleFiles.length, invalidReviewFiles: invalidReviewFiles.length, reachabilityBlockers: reachabilityBlockers.length, productionCutoverAllowed: false }));
process.exitCode = report.runtimeReady ? 0 : 1;
