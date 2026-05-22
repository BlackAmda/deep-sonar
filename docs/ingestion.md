# Ingestion

Ingestion is the process of generating vector embeddings for rows in a client's MySQL table and saving them back. It runs once initially, then on-demand when new rows are added.

## How it works

1. Fetch all rows from the client table where `embedded_at IS NULL`
2. For each row, concatenate the configured `textColumn` value (and optionally other columns) into a single string
3. Send the string to Ollama → receive a 768-dimensional float array
4. Save the vector as JSON into the `vectorColumn` column
5. Update `embedded_at` to `NOW()`
6. Update `vectorCount` on the project record in the meta DB

Rows that already have an `embedding` value are skipped - safe to run multiple times.

## Triggering ingest

### Via dashboard
Open the project page and click "Re-ingest". The dashboard calls `POST /api/projects/[id]/ingest`, which invokes `lib/ingest.ts` directly in-process - no inter-process call needed.

### Via external API
```http
POST /api/ingest
X-Session-Token: sess_Yz9mXqTz
```

### Automatic on new rows
Ingest does not run automatically when rows are added. Options:
- Call `POST /api/ingest` from your application after bulk inserts
- Schedule a nightly cron via PM2 cron restart or a simple cron job

## Required column additions

Before the first ingest, the API automatically runs:

```sql
ALTER TABLE `{tableName}`
  ADD COLUMN IF NOT EXISTS `embedding`   MEDIUMTEXT NULL,
  ADD COLUMN IF NOT EXISTS `embedded_at` DATETIME   NULL;
```

If `ALTER TABLE` fails (e.g. insufficient privileges), run it manually with a user that has DDL rights, then retry ingest.

## Batch size and timing

Default batch size: 10 rows per Ollama call (configurable via `INGEST_BATCH_SIZE`).

Approximate timing on a 2 vCPU VPS:
| Rows | Estimated time |
|---|---|
| 100 | ~40 seconds |
| 500 | ~3 minutes |
| 1,500 | ~8–10 minutes |
| 5,000 | ~25–30 minutes |

Ingest is a background operation - the app remains responsive during ingestion.

## Concurrent ingest protection

Only one ingest job can run per project at a time. If a second `POST /api/ingest` arrives while one is running, the route handler returns `409 Conflict`. The dashboard disables the ingest button while a job is active.

## Text construction

By default, only `textColumn` is embedded. For richer semantic matching, edit `lib/ingest.ts`:

```ts
// lib/ingest.ts
function buildEmbedText(row: Record<string, unknown>, config: ProjectConfig): string {
  // Default: single column
  return String(row[config.textColumn] ?? '').trim();

  // Example: combine name + description + category
  // return [row.name, row.description, row.category]
  //   .filter(Boolean).join(' | ');
}
```

After changing it, re-run ingest to regenerate all embeddings.

## Re-ingesting everything

To force re-embedding of all rows (e.g. after changing `buildEmbedText`):

```sql
-- Run on the client DB
UPDATE `{tableName}` SET embedding = NULL, embedded_at = NULL;
```

Then trigger ingest normally. All rows will be re-processed.

## Vector cache invalidation

After ingest completes, `lib/vector-cache.ts` automatically invalidates the in-memory cache for that project. The next search request will reload fresh vectors from the DB.
