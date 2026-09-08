# D1 schema generation

The SQL and manifest are derived from `prisma/schema.prisma`.

```powershell
python scripts/d1/generate_schema.py
python scripts/d1/test_schema.py
```

The generator writes:

- `prisma/d1/0001_initial.sql`
- `prisma/d1/schema-manifest.json`

The test creates an in-memory SQLite database, checks all 24 tables and foreign keys, verifies JSON array validation including SQL NULL preservation, and checks that a bounded workflow keyset query uses its composite index. DateTime columns use epoch milliseconds, Boolean columns use 0/1, and JSON/String[] columns use JSON text. Scalar-list columns remain SQL NULLable because PostgreSQL can contain NULL arrays; consumers decode SQL NULL as an empty application list where the UI requires a collection. CUID IDs have no database default, so imports and application writes must provide the original ID.
