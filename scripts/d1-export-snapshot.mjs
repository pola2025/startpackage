import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

// Read-only, bounded, consistent source snapshot. Never changes DATABASE_URL.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const split = arg.indexOf('=');
  if (split < 3 || !arg.startsWith('--')) throw new Error('Use --key=value arguments');
  return [arg.slice(2, split), arg.slice(split + 1)];
}));
const allowed = new Set(['env', 'out', 'max-pages', 'page-size']);
if (Object.keys(args).some(key => !allowed.has(key))) throw new Error('Unknown argument');
const pageSize = Number(args['page-size'] ?? 100);
const maxPages = Number(args['max-pages'] ?? 100);
if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
    !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200) {
  throw new Error('page-size must be 1..100; max-pages must be 1..200');
}
const root = path.resolve('.omx/d1-migration');
const output = path.resolve(args.out ?? path.join(root, `snapshot-${Date.now()}`));
if (!output.startsWith(root + path.sep)) throw new Error('Snapshot must stay inside .omx/d1-migration');
const envText = await readFile(args.env ?? '.env', 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
}
if (!env.DATABASE_URL?.startsWith('postgres')) throw new Error('Project-local PostgreSQL DATABASE_URL required');
await mkdir(root, { recursive: true });
await mkdir(output); // Refuse to overwrite or merge snapshots.
const hash = value => createHash('sha256').update(value).digest('hex');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const schema = await readFile('prisma/schema.prisma', 'utf8');
const manifest = {
  version: 1, complete: false, sourceSchemaSha256: hash(schema),
  startedAt: new Date().toISOString(), isolation: 'RepeatableRead, READ ONLY',
  pageSize, maxPages, queries: 0, rows: 0, tables: [],
};
const client = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } }, log: [] });
try {
  await client.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    for (const model of Prisma.dmmf.datamodel.models) {
      const fields = model.fields.filter(field => field.kind !== 'object');
      if (!fields.some(field => field.name === 'id' && field.isId)) throw new Error('Every source table must have an id primary key');
      const tableName = model.dbName ?? model.name;
      const jsonFields = fields.filter(field => field.type === 'Json');
      const projections = fields.map(field => quote(field.dbName ?? field.name));
      for (const field of jsonFields) projections.push(`${quote(field.dbName ?? field.name)} IS NULL AS ${quote('_d1_sql_null_' + field.name)}`);
      const table = { name: tableName, fields: fields.map(f => ({ name: f.dbName ?? f.name, type: f.type, list: f.isList, required: f.isRequired })), pages: [], rows: 0 };
      let lastId;
      for (;;) {
        if (manifest.queries >= maxPages) throw new Error('Snapshot query budget exhausted; incomplete snapshot cannot be imported');
        const sql = `SELECT ${projections.join(', ')} FROM ${quote(tableName)}${lastId === undefined ? '' : ' WHERE "id" > $1'} ORDER BY "id" ASC LIMIT ${pageSize}`;
        const rows = await tx.$queryRawUnsafe(sql, ...(lastId === undefined ? [] : [lastId]));
        manifest.queries++;
        const converted = rows.map(row => fields.map(field => {
          const value = row[field.dbName ?? field.name];
          if (field.type === 'Json') return row['_d1_sql_null_' + field.name] ? null : JSON.stringify(value);
          if (value === null) return null;
          if (field.isList) return JSON.stringify(value);
          if (field.type === 'DateTime') return new Date(value).getTime();
          if (field.type === 'Boolean') return value ? 1 : 0;
          return value;
        }));
        if (rows.length) {
          const file = `${tableName}-${String(table.pages.length).padStart(5, '0')}.json`;
          const content = JSON.stringify(converted);
          await writeFile(path.join(output, file), content, { flag: 'wx', mode: 0o600 });
          table.pages.push({ file, sha256: hash(content), rows: rows.length });
          table.rows += rows.length;
          manifest.rows += rows.length;
          lastId = rows.at(-1).id;
        }
        if (rows.length < pageSize) break;
      }
      manifest.tables.push(table);
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 180000, maxWait: 10000 });
  manifest.complete = true;
  manifest.finishedAt = new Date().toISOString();
} catch {
  // Prisma errors can contain source records or connection details. Do not log them.
  manifest.failure = 'Source export failed or exceeded its budget; incomplete snapshot is not importable';
  process.exitCode = 1;
} finally {
  await client.$disconnect();
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ complete: manifest.complete, tables: manifest.tables.length, rows: manifest.rows, queries: manifest.queries, output }));
