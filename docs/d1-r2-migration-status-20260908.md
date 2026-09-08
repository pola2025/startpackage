# D1/R2 migration status

## 2026-09-09 KST release checkpoint

The following evidence supersedes the historical staging report below. D1 production activation reached READY at commit `078b32d31f2e971dca0da874f35ce6b588eb7c6b`; all three production domains were verified against that deployment with HTTP 200 responses.

- Maintenance was verified on all three production domains before the PostgreSQL application role was made read-only. A fresh connection rejected a zero-row write with SQLSTATE `25006`.
- The frozen snapshot contains 24 tables and 5,329 records, exported in 71 bounded keyset queries. Sensitive submission fields were encrypted in a separate snapshot with round-trip and full local value parity checks.
- New D1 target `startpackage-migration-production-20260909` contains all 5,329 matching records. Full remote comparison used 143 requests and 5,333 rows read.
- Incremental migrations 0002–0009 completed in 13 requests: 95 indexes, 12 triggers, and zero foreign-key violations.
- The Worker was connected to the final database. Real unauthenticated requests returned 401; an authenticated indexed lookup returned 200.
- Eight real Worker reads across user and admin domains returned 200. Sensitive values remained encrypted at the Worker boundary. User and admin login screens rendered without browser exceptions; authenticated end-to-end mutation testing was performed in the isolated QA environment, not against customer records in production.
- Runtime reachability now passes for 103 guarded files. Authentication, submissions, workflows, administration, communication, and scheduled jobs use the D1 branches; PostgreSQL model access fails closed when D1 is enabled.
- User/admin browser E2E passed in an isolated environment with external sends suppressed. Intake, revisions, confirmation, orders, shipping, homepage, secret masking/reveal, shipping locks, and all 106 paginated history messages were checked.
- 41 test files / 250 tests, production build, TypeScript, and lint passed; existing lint warnings remain.
- All five production R2 settings match project-local authority and bucket access passed. Oversized files direct users to `mkt@polarad.co.kr`.
- DB encryption and response masking preserve the existing Slack business credential handoff. Confirmation content and print-color agreements are retained. Marketing service copy uses 8 weeks.

Keep PostgreSQL read-only after the first D1 write. Returning to it requires reconciliation, not only a flag change. Source and encrypted snapshots, schema ledgers, deployment IDs, alias verification, and live smoke evidence remain private under `.omx/d1-migration/`.

## Historical staging report — superseded

## Current boundary

The application still uses PostgreSQL through Prisma. `startpackage-migration-20260908` is an isolated D1 staging copy, not the production source of truth. No application connection, R2 object, production Worker, or deployment setting was switched.

The runtime cutover gate identifies 106 files with Prisma dependencies, including database entrypoints. Do not activate D1 reads while PostgreSQL remains the write target. Do not retire the source database based on staging validation.

## Verified data transfer

- All 24 tables were converted with original IDs, relationships, field names, and R2 references.
- A read-only repeatable-read source snapshot exported 5,324 records in 71 bounded data queries.
- Every value passed local SQLite comparison and foreign-key checks. Five SQL NULL attachment arrays were preserved.
- Import into a new remote D1 database completed in four API requests plus one upload.
- Remote comparison checked all 5,324 records with 100-row primary-key cursor pages. Every data query passed an indexed SEARCH plan check.
- The full remote verification used 143 API requests and 5,328 D1 rows read.
- Private snapshot, import SQL, and evidence remain in Git-ignored `.omx/d1-migration/snapshot-1788856993779`. These contain sensitive customer data and must not be published.

## Prepared runtime controls

These controls are implemented and locally tested, but not wired into production:

- Communication pages default to 20 and allow at most 50 items, with one lookahead record. Signed cursors bind deterministic timestamp/ID ordering to the user or thread. No OFFSET or automatic page-draining loop is used.
- Composite indexes cover communication, design history, workflow logs, notifications, latest-design selection, and phone lookup.
- Opt-in server cache has expiry, 100-entry and 2 MB serialized-payload budgets, bounded concurrent loads, deduplication, and failure eviction. This bounds retained payload, not exact JavaScript heap size.
- Authentication, writes, and confirmation bypass the cache. Message ownership is checked before cache hits.
- The separate, undeployed read Worker has service authentication, an 8 KB body cap, 32 active-request cap per instance, and a configured rate-limit binding. It has no arbitrary SQL endpoint.
- The server client makes one request with a 10-second timeout, no redirects, and no retries.
- Atomic signup creates the user, seven workflows, and submission together. Atomic confirmation retains all agreement, print-color, shipping, snapshot, and history behavior, rejecting stale ownership or design changes.

Regional rate limiting and per-instance cache/concurrency caps do not establish an exact account-wide daily spend cap. Production needs reviewed traffic limits and D1 usage monitoring.

## Remaining work before production cutover

1. Replace runtime Prisma dependencies across auth, submissions, workflow actions, communication, administration, notifications, and scheduled jobs. The staged Worker exposes only communication reads.
2. Convert all remaining multi-record transactions and nested writes to atomic batches without changing permissions or confirmation/order behavior.
3. Update list consumers to follow cursors so older records remain accessible. Scheduled jobs need page/query/run budgets and saved continuations; never silently truncate or drain every page in one request.
4. Verify application behavior against D1 with isolated fixtures: signup, login, autosave, revisions, confirmation, orders, shipping, administration, and failed/concurrent writes. Suppress customer-facing notifications during QA.
5. Provision the separate data Worker and service secrets through project-local authority and a pushed version record. Preserve the Telegram Worker.
6. Take and validate a final snapshot during a controlled write pause, then switch complete read/write authority together. The current staging snapshot does not receive subsequent PostgreSQL writes.
7. Verify production flows and R2 links before retiring PostgreSQL. After the first D1 write, rollback requires reconciling those writes; switching back alone would lose them.

## Validation

```powershell
python scripts/d1/test_schema.py
python -m unittest discover -s scripts -p test_d1_stage_import.py
node node_modules/vitest/vitest.mjs run --config vitest.d1.config.ts
node node_modules/typescript/bin/tsc --noEmit --pretty false
node scripts/d1-cutover-gate.mjs
```

The cutover gate intentionally exits nonzero while Prisma dependencies remain. A passing scan does not replace flow parity, final snapshot, or release identity checks.

Import tools enforce finite request budgets. Replaying a completed import makes no network calls. An incomplete import with a saved polling bookmark can use `--resume`, which never silently reimports. Do not repeat full remote comparison unless the target or snapshot changes.
