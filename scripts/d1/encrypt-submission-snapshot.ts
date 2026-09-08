import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptSubmissionSecrets, encryptSubmissionSecrets } from "../../lib/security/submission-secrets";

type SnapshotField = { name: string; type: string; list: boolean; required: boolean };
type SnapshotTable = { name: string; fields: SnapshotField[]; pages: SnapshotPage[]; rows: number };
type SnapshotPage = { file: string; sha256: string; rows: number };
type SnapshotManifest = {
  version: number;
  complete: boolean;
  sourceSchemaSha256: string;
  tables: SnapshotTable[];
  rows: number;
  [key: string]: unknown;
};

type TransformOptions = { key?: string; dryRun?: boolean };
type TransformResult = { complete: true; rows: number; encryptedRows: number; pages: number; sha256: string; output?: string };

const ROOT = path.resolve(".omx/d1-migration");
const SECRET_PREFIX = "spenc:v1:";

export async function encryptSubmissionSnapshot(
  inputDir: string,
  outputDir: string,
  options: TransformOptions = {},
): Promise<TransformResult> {
  const input = path.resolve(inputDir);
  const output = path.resolve(outputDir);
  assertSnapshotPath(input);
  assertSnapshotPath(output);
  if (input === output) throw new Error("Encrypted snapshot must use a separate output directory");
  const manifest = JSON.parse(await readFile(path.join(input, "manifest.json"), "utf8")) as SnapshotManifest;
  if (manifest.complete !== true) throw new Error("Incomplete source snapshot cannot be encrypted");
  const sourceFiles = await loadSourcePages(input, manifest);
  const submissionTable = manifest.tables.find((table) => table.name === "submissions");
  if (!submissionTable) throw new Error("Snapshot does not contain Submission table");

  const transformed = new Map<string, string>();
  let encryptedRows = 0;
  for (const [file, rows] of sourceFiles) {
    const table = manifest.tables.find((candidate) => candidate.pages.some((page) => page.file === file));
    if (!table || table.name !== "submissions") continue;
    const values = rows.map((row) => {
      const record = rowToRecord(row, table.fields);
      const userId = stringValue(record.userId);
      if (!userId) throw new Error(`Submission row ${file} has no userId`);
      const originalPlain = decryptSubmissionSecrets(record, userId, options.key);
      const encrypted = encryptSubmissionSecrets(record, userId, options.key);
      if (hasEncryptedSecret(encrypted)) encryptedRows++;
      const roundTrip = decryptSubmissionSecrets(encrypted, userId, options.key);
      if (JSON.stringify(roundTrip) !== JSON.stringify(originalPlain)) throw new Error(`Submission round-trip failed for ${file}`);
      return recordToRow(encrypted, table.fields);
    });
    transformed.set(file, JSON.stringify(values));
  }

  const pageContents = new Map<string, string>();
  for (const [file, rows] of sourceFiles) pageContents.set(file, transformed.get(file) ?? JSON.stringify(rows));
  const digest = hash([...pageContents.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, content]) => content).join("\n"));
  const result: TransformResult = {
    complete: true,
    rows: manifest.rows,
    encryptedRows,
    pages: pageContents.size,
    sha256: digest,
  };
  if (options.dryRun) return result;

  const temp = `${output}.tmp-${process.pid}`;
  assertSnapshotPath(path.resolve(temp));
  await mkdir(path.dirname(temp), { recursive: true });
  await mkdir(temp);
  try {
    for (const [file, content] of pageContents) await writeFile(path.join(temp, file), content, { flag: "wx", mode: 0o600 });
    const encryptedTables = manifest.tables.map((table) => ({
      ...table,
      pages: table.pages.map((page) => ({
        ...page,
        sha256: hash(pageContents.get(page.file) ?? ""),
      })),
    }));
    const encryptedManifest = {
      ...manifest,
      sourceSnapshotSchemaSha256: manifest.sourceSchemaSha256,
      targetSchemaSha256: hash(await readFile("prisma/schema.prisma", "utf8")),
      tables: encryptedTables,
      encryption: { algorithm: "AES-256-GCM", version: 1, target: "Submission sensitive fields" },
      encryptedRows,
      outputSha256: digest,
    };
    await writeFile(path.join(temp, "manifest.json"), JSON.stringify(encryptedManifest, null, 2), { flag: "wx", mode: 0o600 });
    await mkdir(path.dirname(output), { recursive: true });
    const { rename } = await import("node:fs/promises");
    await rename(temp, output);
  } catch (error) {
    await rm(temp, { recursive: true, force: true });
    throw error;
  }
  return { ...result, output };
}

async function loadSourcePages(input: string, manifest: SnapshotManifest): Promise<Map<string, unknown[][]>> {
  const pages = new Map<string, unknown[][]>();
  let totalRows = 0;
  for (const table of manifest.tables) {
    let tableRows = 0;
    for (const page of table.pages) {
      const filename = path.resolve(input, page.file);
      if (path.dirname(filename) !== input || pages.has(page.file)) throw new Error("Invalid snapshot page path");
      const content = await readFile(filename, "utf8");
      if (hash(content) !== page.sha256) throw new Error(`Snapshot page hash mismatch: ${page.file}`);
      const rows: unknown = JSON.parse(content);
      if (!Array.isArray(rows) || rows.some((row) => !Array.isArray(row))) throw new Error(`Malformed snapshot page: ${page.file}`);
      if (rows.length !== page.rows) throw new Error(`Snapshot row count mismatch: ${page.file}`);
      pages.set(page.file, rows as unknown[][]);
      tableRows += rows.length;
    }
    if (tableRows !== table.rows) throw new Error("Snapshot table row count mismatch");
    totalRows += tableRows;
  }
  if (totalRows !== manifest.rows) throw new Error("Snapshot total row count mismatch");
  return pages;
}

function rowToRecord(row: unknown[], fields: SnapshotField[]): Record<string, unknown> {
  if (row.length !== fields.length) throw new Error("Snapshot row field count mismatch");
  return Object.fromEntries(fields.map((field, index) => [field.name, row[index]]));
}

function recordToRow(record: Record<string, unknown>, fields: SnapshotField[]): unknown[] {
  return fields.map((field) => record[field.name]);
}

function hasEncryptedSecret(record: Record<string, unknown>): boolean {
  return Object.values(record).some((value) => typeof value === "string" && value.startsWith(SECRET_PREFIX)) ||
    (typeof record.autoSaveData === "string" && record.autoSaveData.includes(SECRET_PREFIX));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertSnapshotPath(value: string): void {
  if (!value.startsWith(ROOT + path.sep)) throw new Error("Snapshot path must stay inside .omx/d1-migration");
}

async function main(): Promise<void> {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const split = arg.indexOf("=");
    if (!arg.startsWith("--") || split < 3) throw new Error("Use --key=value arguments");
    return [arg.slice(2, split), arg.slice(split + 1)];
  }));
  const allowed = new Set(["in", "out", "env", "dry-run"]);
  if (Object.keys(args).some((key) => !allowed.has(key))) throw new Error("Unknown argument");
  if (!args.in || !args.out) throw new Error("Use --in=<snapshot> --out=<encrypted-snapshot>");
  const envText = await readFile(path.resolve(args.env ?? ".env"), "utf8");
  const env: Record<string, string> = {};
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  const key = env.SUBMISSION_ENCRYPTION_KEY;
  if (!key) throw new Error("Project-local SUBMISSION_ENCRYPTION_KEY is required");
  const result = await encryptSubmissionSnapshot(args.in, args.out, { key, dryRun: args["dry-run"] === "true" });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith("encrypt-submission-snapshot.ts")) {
  main().catch((error: unknown) => {
    console.error(JSON.stringify({ complete: false, errorType: error instanceof Error ? error.name : "Error" }));
    process.exitCode = 1;
  });
}
