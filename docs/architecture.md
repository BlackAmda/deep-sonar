# Architecture

## Overview

One process, one VPS, one MySQL instance.

```
[Your app]      →  X-API-Key  →  [Next.js :3000 /api/sessions]  →  MySQL (client DB)
[Your app]      →  X-Session-Token → [/api/search, /api/ingest]  →  MySQL (meta DB)
[Admin browser] →  admin session → [/api/projects, /api/stats …]   →  MySQL (meta DB)
                                             ↓
                                      [Ollama :11434]
                                      nomic-embed-text
```

Admin UI pages and the external search API all run inside the same Next.js process. External API routes handle their own auth; admin routes are protected by `middleware.ts` and a DB-backed session check.

## Security model - credentials never travel over the wire

Credentials have exactly one entry point: the admin dashboard registration form. After that, they are AES-256-GCM encrypted and stored in MySQL. They are never returned by any API endpoint.

### Phase 1 - one-time admin setup

1. Admin opens dashboard, fills in project registration form
2. Dashboard calls `POST /api/projects` (Next.js route handler)
3. Route handler encrypts the DB config with `ENCRYPTION_KEY`
4. Encrypted config stored in `projects` table
5. A unique API key is generated (`ds_{slug}_{nanoid}`) and returned once

### Phase 2 - runtime (no credentials in transit)

```
POST /api/sessions
X-API-Key: ds_catalog_K8mXq2…
(empty body)

→ Route handler looks up project by api_key
→ Route handler decrypts db_config internally
→ Opens MySQL connection to client DB
→ Creates session token → stored in sessions table
← { token: "sess_Yz9…", expires_at: "…" }

GET /api/search?q=wireless+headphones&limit=10&threshold=0.65
X-Session-Token: sess_Yz9…

→ Route handler resolves session → project_id
→ Loads cached vectors for this project (lib/vector-cache.ts)
→ Embeds query via Ollama (~80ms)
→ Runs cosine similarity in-process (~5ms)
← { results: [...], latency_ms: 112 }
```

## Search flow


| Step      | Action                                             | Latency       |
| --------- | -------------------------------------------------- | ------------- |
| 1         | Send query string to Ollama → get 768-dim float[]  | ~80ms         |
| 2         | Load all project vectors from memory cache         | ~0ms (cached) |
| 3         | Compute cosine similarity against all rows         | ~5ms          |
| 4         | Sort descending, filter by threshold, return top N | ~2ms          |
| **Total** |                                                    | **~90–150ms** |


Vector cache is loaded once per project on first search, then refreshed every 5 minutes via a background interval. A cold cache hit (first ever search or post-restart) fetches directly from the client's MySQL DB - this adds ~10ms.

## Cosine similarity

No vector database. No external service. At 1,500 rows × 768 dimensions this runs entirely in the Node.js process:

```js
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

This scales safely to ~50,000 rows before needing an ANN (approximate nearest neighbour) solution.

## Embedding model

**Model:** `nomic-embed-text` via Ollama  
**Dimensions:** 768  
**RAM required:** ~500 MB  
**Why not Gemma:** Gemma is a generative model. `nomic-embed-text` is a dedicated embedding model - purpose-built for semantic similarity.

## Encryption

DB configs are encrypted before storage using Node.js built-in `crypto`:

- Algorithm: AES-256-GCM
- Key: 32-byte hex from `ENCRYPTION_KEY` env var
- IV: random 12 bytes, prepended to ciphertext
- Auth tag: appended to ciphertext
- Stored as: `iv:authTag:ciphertext` (hex-encoded, colon-separated)

## Module responsibilities

### `lib/` - shared server modules

- `prisma.ts` - Prisma client singleton
- `crypto.ts` - AES-256-GCM encrypt/decrypt
- `ollama.ts` - Ollama embedding calls
- `vector-cache.ts` - per-project in-memory vector cache with TTL refresh
- `cosine.ts` - cosine similarity
- `ingest.ts` - embedding generation and DB write-back

### `app/api/` - route handlers

**External API** (auth via `X-API-Key` / `X-Session-Token`, not ADMIN_TOKEN):

- `sessions/` - create and invalidate sessions
- `search/` - semantic search
- `ingest/` - trigger embedding generation
- `health/` - health check

**Admin API** (auth via ADMIN_TOKEN, enforced by `middleware.ts`):

- `projects/` - CRUD projects
- `stats/` - dashboard summary numbers
- `logs/` - paginated usage logs

### `app/(admin)/` - admin UI

- Dashboard pages built with Next.js 16 App Router
- Protected by `middleware.ts`
- Calls admin API route handlers server-side

