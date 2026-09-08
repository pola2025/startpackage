#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const MIGRATION_DIR = resolve(ROOT, "prisma/d1");
const STATE_DIR = resolve(ROOT, ".omx/d1-migration");
const MAX_REQUESTS = 30;
const REQUEST_TIMEOUT_MS = 30_000;

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1] ?? true;
}

function hasFlag(name) { return process.argv.includes(`--${name}`); }
function fail(message) { throw new Error(message); }
function quote(value) { return `"${String(value).replaceAll('"', '""')}"`; }

function defaultRehearsalDir() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return resolve(STATE_DIR, `snapshot-encrypted-rehearsal-${stamp}-${Math.random().toString(36).slice(2, 8)}`);
}

async function readEnv() {
  const env = {};
  // Explicit project-local precedence; inherited process variables are ignored.
  for (const name of [".env", ".env.production", ".env.local", ".env.production.local"]) {
    const file = resolve(ROOT, name);
    if (!existsSync(file)) continue;
    const text = await readFile(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  return env;
}

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

async function migrationFiles() {
  const entries = await readdir(MIGRATION_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && /^000[2-9]_.*\.sql$/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => resolve(MIGRATION_DIR, entry.name));
}

// Split ordinary D1 statements while retaining semicolons inside CREATE TRIGGER bodies.
function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let quoteChar = null;
  let trigger = false;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (quoteChar) {
      if (character === quoteChar && sql[index + 1] === quoteChar) { index += 1; continue; }
      if (character === quoteChar) quoteChar = null;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") { quoteChar = character; continue; }
    if (sql.slice(start, index + 1).match(/^\s*CREATE\s+(?:TEMP\s+)?TRIGGER\b/i)) trigger = true;
    if (character !== ";") continue;
    const candidate = sql.slice(start, index + 1).trim();
    if (!candidate) { start = index + 1; continue; }
    if (trigger && !/\bEND\s*;\s*$/i.test(candidate)) continue;
    statements.push(candidate);
    start = index + 1;
    trigger = false;
  }
  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

async function apiClient(env, databaseId) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) fail("Project-local CLOUDFLARE_ACCOUNT_ID is required");
  if (!databaseId || !/^[0-9a-f-]{36}$/i.test(databaseId)) fail("A valid --db-id is required");
  const headers = { "content-type": "application/json" };
  if (env.CLOUDFLARE_API_TOKEN) headers.authorization = `Bearer ${env.CLOUDFLARE_API_TOKEN}`;
  else if (env.CLOUDFLARE_EMAIL && env.CLOUDFLARE_API_KEY) {
    headers["X-Auth-Email"] = env.CLOUDFLARE_EMAIL;
    headers["X-Auth-Key"] = env.CLOUDFLARE_API_KEY;
  } else fail("Project-local Cloudflare authority is required");
  let requests = 0;
  async function query(sql, params = []) {
    if (requests >= MAX_REQUESTS) fail("D1 request budget exceeded");
    requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
        method: "POST", headers, body: JSON.stringify({ sql, params }), signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok || !body.success || !Array.isArray(body.result) || body.result.length === 0 || body.result.some((item) => item?.success !== true)) {
        fail(`D1 query failed (request ${requests})`);
      }
      return body.result.flatMap((item) => item.results ?? []);
    } finally { clearTimeout(timer); }
  }
  return { query, requests: () => requests };
}

async function inspectRemote(client) {
  const tables = await client.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const indexes = await client.query("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const triggers = await client.query("SELECT name, tbl_name FROM sqlite_master WHERE type='trigger' ORDER BY name");
  const fanoutColumns = await client.query("PRAGMA table_info(\"notification_fanouts\")");
  const foreignKeyErrors = await client.query("PRAGMA foreign_key_check");
  const report = {
    tables: tables.map((row) => row.name),
    indexes: indexes.map((index) => ({ table: index.tbl_name, name: index.name, unique: /CREATE UNIQUE INDEX/i.test(index.sql ?? "") })),
    triggers: triggers.map((trigger) => ({ table: trigger.tbl_name, name: trigger.name })),
    columns: { notification_fanouts: fanoutColumns },
    foreignKeyErrors,
    requests: client.requests(),
  };
  report.requests = client.requests();
  return report;
}

function columnNames(report, table) { return new Set((report.columns[table] ?? []).map((column) => column.name)); }
function rewriteForExistingColumns(file, sql, report) {
  if (!file.endsWith("0008_fanout_resume.sql")) return sql;
  const columns = columnNames(report, "notification_fanouts");
  return splitSqlStatements(sql).filter((statement) => {
    const match = statement.match(/^ALTER TABLE\s+"notification_fanouts"\s+ADD COLUMN\s+"([^"]+)"/i);
    return !match || !columns.has(match[1]);
  }).join("\n");
}

async function runRehearsal(files, outputDir) {
  if (existsSync(outputDir)) fail(`Refusing to overwrite rehearsal directory: ${relative(ROOT, outputDir)}`);
  await mkdir(outputDir, { recursive: false });
  const source = resolve(String(arg("source-sqlite", resolve(STATE_DIR, "snapshot-encrypted-rehearsal-20260908-2310/validated-1788876618276727300.sqlite"))));
  if (!existsSync(source)) fail(`Validated SQLite import is missing: ${relative(ROOT, source)}`);
  const dbPath = resolve(outputDir, "rehearsal.sqlite");
  await copyFile(source, dbPath);
  const db = new DatabaseSync(dbPath);
  const applied = [];
  for (const file of files) {
    const sql = await readFile(file, "utf8");
    const statements = splitSqlStatements(sql);
    db.exec(sql);
    applied.push({ file: relative(ROOT, file).replaceAll("\\", "/"), sha256: sha256(sql), statements: statements.length });
  }
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name);
  const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  const foreignKeys = tables.flatMap((table) => db.prepare(`PRAGMA foreign_key_list(${quote(table)})`).all().map((row) => ({ table, from: row.from, target: row.table, to: row.to })));
  const foreignKeyErrors = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyErrors.length) fail(`Foreign key check failed with ${foreignKeyErrors.length} violation(s)`);
  const report = { complete: true, source: relative(ROOT, source).replaceAll("\\", "/"), copiedEncryptedSqlite: true, applied, tableCount: tables.length, tables, indexCount: indexes.length, indexes, foreignKeyCount: foreignKeys.length, foreignKeyErrors: 0, foreignKeys };
  await writeFile(resolve(outputDir, "rehearsal.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
  db.close();
  return report;
}

async function main() {
  const files = await migrationFiles();
  if (!files.length) fail("No incremental migrations found");
  const hashes = {};
  for (const file of files) hashes[relative(ROOT, file).replaceAll("\\", "/")] = sha256(await readFile(file));
  const rehearsalDir = resolve(String(arg("rehearsal-dir", defaultRehearsalDir())));
  const rehearsal = await runRehearsal(files, rehearsalDir);
  const env = await readEnv();
  const databaseId = String(arg("db-id", ""));
  const ledgerKey = databaseId && env.CLOUDFLARE_ACCOUNT_ID ? `${env.CLOUDFLARE_ACCOUNT_ID}-${databaseId}` : "inspection";
  const statePath = resolve(STATE_DIR, `incremental-schema-ledger-${ledgerKey}.json`);
  const state = existsSync(statePath) ? JSON.parse(await readFile(statePath, "utf8")) : { version: 1, migrations: {} };
  for (const [name, hash] of Object.entries(hashes)) if (state.migrations[name]?.sha256 && state.migrations[name].sha256 !== hash) fail(`Migration changed after ledger record: ${name}`);
  const output = { mode: hasFlag("apply") ? "apply" : "inspect", databaseId: databaseId || null, migrationCount: files.length, migrations: hashes, rehearsal: { dir: relative(ROOT, rehearsalDir).replaceAll("\\", "/"), tableCount: rehearsal.tableCount, indexCount: rehearsal.indexCount, foreignKeyCount: rehearsal.foreignKeyCount }, requests: 0 };
  if (!hasFlag("apply")) {
    await writeFile(resolve(STATE_DIR, "incremental-schema-inspection.json"), JSON.stringify(output, null, 2) + "\n", "utf8");
    console.log(JSON.stringify(output));
    return;
  }
  if (!databaseId) fail("--apply requires --db-id");
  const wrangler = await readFile(resolve(ROOT, "cloudflare-workers/startpackage-data/wrangler.toml"), "utf8");
  const configuredAccount = wrangler.match(/^account_id\s*=\s*"([^"]+)"/m)?.[1];
  const configuredDatabase = wrangler.match(/^database_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!configuredAccount || !configuredDatabase || configuredAccount !== env.CLOUDFLARE_ACCOUNT_ID || configuredDatabase !== databaseId) {
    fail("Target account/database must match project-local wrangler.toml");
  }
  if (state.scope && (state.scope.accountId !== env.CLOUDFLARE_ACCOUNT_ID || state.scope.databaseId !== databaseId)) {
    fail("Incremental schema ledger belongs to a different account/database");
  }
  const status = execFileSync("git", ["status", "--porcelain", "--", "prisma/d1", "scripts/d1"], { cwd: ROOT, encoding: "utf8" }).trim();
  if (status) fail("Migration files are not clean; commit and push the exact migration set before --apply");
  const branch = execFileSync("git", ["branch", "--show-current"], { cwd: ROOT, encoding: "utf8" }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const remote = execFileSync("git", ["ls-remote", "origin", `refs/heads/${branch}`], { cwd: ROOT, encoding: "utf8" }).trim().split(/\s+/)[0];
  if (!branch || remote !== head) fail("The current migration commit is not pushed to origin; refusing remote schema writes");
  const client = await apiClient(env, databaseId);
  const remoteBefore = await inspectRemote(client);
  output.remoteBefore = { tableCount: remoteBefore.tables.length, indexCount: remoteBefore.indexes.length, triggerCount: remoteBefore.triggers.length, foreignKeyErrors: remoteBefore.foreignKeyErrors.length, requests: client.requests() };
  const expected = { tables: [], indexes: [], triggers: [] };
  for (const file of files) {
    const sql = await readFile(file, "utf8");
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"/gi)) expected.tables.push(match[1]);
    for (const match of sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"/gi)) expected.indexes.push(match[1]);
    for (const match of sql.matchAll(/CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"/gi)) expected.triggers.push(match[1]);
  }
  const applied = [];
  for (const file of files) {
    const name = relative(ROOT, file).replaceAll("\\", "/");
    const previous = state.migrations[name];
    if (previous?.status === "pending") fail(`Migration has uncertain partial state; inspect D1 before retrying: ${name}`);
    if (previous?.status === "applied") continue;
    const original = await readFile(file, "utf8");
    const sql = rewriteForExistingColumns(file, original, remoteBefore);
    const statements = splitSqlStatements(sql).filter((statement) => statement.trim());
    // Keep the migration file as one request. The pending ledger is written
    // before this request so an uncertain partial result cannot be retried.
    state.scope = { accountId: env.CLOUDFLARE_ACCOUNT_ID, databaseId };
    state.migrations[name] = { sha256: hashes[name], status: "pending", statements: statements.length, startedAt: new Date().toISOString(), commit: head };
    await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
    try {
      await client.query(sql);
    } catch (error) {
      await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
      throw error;
    }
    state.migrations[name] = { ...state.migrations[name], status: "applied", appliedAt: new Date().toISOString() };
    await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
    applied.push(name);
  }
  output.applied = applied;
  output.requests = client.requests();
  output.remoteAfter = await inspectRemote(client);
  const actual = output.remoteAfter;
  const missing = {
    tables: expected.tables.filter((name) => !actual.tables.includes(name)),
    indexes: expected.indexes.filter((name) => !actual.indexes.some((index) => index.name === name)),
    triggers: expected.triggers.filter((name) => !actual.triggers.some((trigger) => trigger.name === name)),
  };
  if (actual.foreignKeyErrors.length || missing.tables.length || missing.indexes.length || missing.triggers.length) {
    fail(`Post-apply schema verification failed: ${JSON.stringify({ missing, foreignKeyErrors: actual.foreignKeyErrors.length })}`);
  }
  output.remoteAfter = { tableCount: actual.tables.length, indexCount: actual.indexes.length, triggerCount: actual.triggers.length, foreignKeyErrors: actual.foreignKeyErrors.length, requests: actual.requests };
  await writeFile(resolve(STATE_DIR, "incremental-schema-apply.json"), JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...output, remoteAfter: { tableCount: output.remoteAfter.tables.length, indexCount: output.remoteAfter.indexes.length, requests: output.remoteAfter.requests } }));
}

main().catch((error) => { console.error(JSON.stringify({ complete: false, errorType: error.name, message: error.message })); process.exitCode = 1; });
