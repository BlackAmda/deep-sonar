# Dashboard

Next.js 16 App Router admin interface. Protected by `ADMIN_TOKEN` bearer auth enforced in `middleware.ts`.

## Pages

### `/` - Overview
- Stats: total projects, searches today, average latency, total vectors stored
- Recent search activity log (last 50 entries across all projects)
- Quick re-ingest-all button

### `/projects` - Project list
- All registered projects with status, vector count, last ingested date
- Register new project (opens form)
- Per-project: copy API key, rotate key, trigger ingest, view usage, edit config, delete

### `/projects/[id]` - Project detail
- Full project config (DB host, table, columns - password masked)
- Usage chart: searches per day (last 30 days)
- Search log for this project
- Ingest progress and history

## Route handlers (`app/api/`)

### GET /api/projects
Returns all projects with stats.

```ts
// Response
[
  {
    id: "clx1a2b3c",
    name: "Product Catalog",
    slug: "catalog",
    tableName: "products",
    vectorCount: 1482,
    lastIngestedAt: "2026-05-20T08:00:00Z",
    isActive: true,
    searchesToday: 423
  }
]
```

### POST /api/projects
Registers a new project. Encrypts DB config before storing.

```ts
// Request body
{
  name: string,
  slug: string,           // short identifier, used in API key prefix
  host: string,
  port: number,
  database: string,
  user: string,
  password: string,
  tableName: string,
  textColumn: string,
  idColumn: string,
  vectorColumn?: string   // defaults to "embedding"
}

// Response
{
  id: "clx1a2b3c",
  apiKey: "ds_catalog_K8mXq2TzNpLw9aYrB3",  // shown ONCE - copy it now
  name: "Product Catalog"
}
```

### PATCH /api/projects/[id]
Updates project config (re-encrypts if DB credentials changed). Does not allow changing `slug` or `apiKey`.

### DELETE /api/projects/[id]
Deletes project and cascades to sessions and usage logs.

### POST /api/projects/[id]/rotate-key
Generates a new API key. Old key is immediately invalidated.

```ts
// Response
{ apiKey: "ds_catalog_NewK8mXq2…" }  // shown ONCE
```

### POST /api/projects/[id]/ingest
Calls `lib/ingest.ts` directly using the stored (server-side decrypted) API key. No inter-process call - runs in the same Next.js process.

```ts
// Response
{ embedded: 12, skipped: 1488, failed: 0, durationMs: 8200 }
```

### GET /api/stats
Dashboard summary numbers.

```ts
// Response
{
  totalProjects: 3,
  searchesToday: 847,
  avgLatencyMs: 118,
  totalVectors: 4210
}
```

### GET /api/logs
Paginated usage log across all projects.

```ts
// Query: ?page=1&limit=50&projectId=clx1a2b3c
// Response
{
  logs: [
    {
      id: "clx...",
      projectName: "Product Catalog",
      query: "wireless headphones",
      results: 8,
      topScore: 0.91,
      latencyMs: 112,
      loggedAt: "2026-05-20T14:32:00Z"
    }
  ],
  total: 847,
  page: 1
}
```

## Middleware

`middleware.ts` protects:
- All admin UI routes (`/`, `/projects/*`, `/login` redirect excluded)
- Admin API routes (`/api/projects/*`, `/api/stats`, `/api/logs`)

External API routes (`/api/sessions`, `/api/search`, `/api/ingest`, `/api/health`) are **excluded** from the ADMIN_TOKEN check - they handle their own auth via `X-API-Key` / `X-Session-Token`.

Unauthenticated requests to protected routes are redirected to `/login`.

`/login` is a simple password form - on submit it sets an `admin_token` cookie and redirects to `/`.

## No inter-process calls

The dashboard never calls a separate backend process. Admin route handlers import `lib/ingest.ts`, `lib/prisma.ts`, and `lib/crypto.ts` directly. The browser never sees project API keys - decryption happens server-side inside the route handler.
