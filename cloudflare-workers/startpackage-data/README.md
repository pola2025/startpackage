# Startpackage D1 service

Private server-to-server Worker for the Next application. The sibling Telegram webhook Worker is a separate deployment: never use its config for this service. The checked-in config identifies the migration D1 database; neither a public route nor a workers.dev URL is active merely because this directory exists.

## Runtime boundary

The service accepts named POST operations under `/v1/`: `auth`, `core`, `content-domain`, `admin-domain`, `admin-pages`, `admin-notifications`, `communication-domain`, and `shared-domain`. Legacy bounded communication list endpoints remain supported. SQL is internal and is never accepted as a request operation. Next supplies the authenticated user/admin identity; service bearer credentials must never reach browsers.

Required Worker secrets: `DATA_SERVICE_TOKEN` and `CURSOR_SECRET`, each at least 32 characters, plus `SUBMISSION_ENCRYPTION_KEY` (32 bytes encoded as base64). Next must use the same encryption key. Required Next configuration: `D1_DATA_SERVICE_URL` (HTTPS), matching `D1_DATA_SERVICE_TOKEN`, `D1_RUNTIME_ENABLED`, `AUTH_RATE_LIMIT_SECRET`, and `CRON_SECRET` (at least 32 characters). For Vercel production configure `AUTH_TRUSTED_IP_HEADER=x-vercel-forwarded-for`; local QA deliberately does not trust arbitrary proxy headers. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

D1 uses numeric epoch dates, integer booleans, and encoded JSON. Domain response codecs and page adapters preserve application DTOs. Prisma model operations fail closed when D1 is enabled, and database calls pause during `D1_MIGRATION_MAINTENANCE=true`.

## Cost and retry controls

- Cursor pages default to bounded sizes with a maximum of 50. Signed cursor scopes include applicable ownership/filter context. Multi-ID notification lookups use at most four chunks of 50 IDs, below D1's [100-parameter limit](https://developers.cloudflare.com/d1/platform/limits/).
- `READ_LIMITER` permits 600 requests per minute per key per Cloudflare location, checked first for the service and then the principal. Maximum in-flight requests per isolate is 32. This allows ordinary multi-query page loads while bounding traffic bursts. It is not an exact global spending cap: [Cloudflare documents regional, eventually consistent counters](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- Login attempts separately reserve an atomic account budget of 5 and IP budget of 50 in 15 minutes. These are attempt budgets, including successful attempts. A scheduled Worker task deletes at most 2,000 expired login keys per 15-minute run through the expiry index, retaining two days.
- Communication unread/message counts use transactional SQL triggers. Selected aggregate reads have short TTL caches; cold caches can still scan matching indexed rows. Inspect EXPLAIN and `rows_read`, not only returned row counts.
- Content-tip email delivery records progress and leases, batches result writes, and processes at most five recipient pages per invocation. A secured Vercel GET cron resumes up to five unfinished jobs daily at 12:00 KST. The app must provision `CRON_SECRET`; a cron declaration alone is not evidence of successful live delivery. External send success followed by a lost DB acknowledgement remains a retry ambiguity without provider idempotency.

## Cutover order

1. Pass current D1/auth/flow tests, typecheck/build, and isolated authenticated page plus mutation QA. Preserve all confirmation, shipping and print-color agreements and notification context.
2. Verify project-local Git, remote authentication, provider/team/project identities and ignored artifacts. Record the exact deployable commit and push before deployment.
3. Prepare the authenticated Worker endpoint and secrets. Apply all schema files in order to the intended isolated D1 target. Do not enable the application against an incomplete schema.
4. Pause application traffic and freeze PostgreSQL writes for this database/role, including older deployment connections. Record the prior role setting for exact restoration and verify a fresh connection rejects a zero-row permanent-table UPDATE with SQLSTATE 25006. Role defaults are an operational barrier, not protection against someone deliberately overriding the setting.
5. Export a fresh bounded consistent snapshot, preserve the original, and transform submission secrets into a separate encrypted snapshot with the production encryption key. Import the encrypted snapshot with manifests/checkpoints, and verify schema, hashes, row parity and foreign keys. Do not mix D1 reads with PostgreSQL writes. Slack credential handoff remains supported; default responses are masked and explicit super-admin reveal is audited.
6. Activate the complete D1 application deployment, verify READY and production aliases, and resume traffic. Never execute customer sends as QA.

Before the first D1 production write, rollback may restore the recorded source setting and old application. After D1 receives writes, PostgreSQL is stale: preserve/reconcile D1 changes before any source rollback. The local migration evidence directory is ignored and must not be uploaded or committed.
