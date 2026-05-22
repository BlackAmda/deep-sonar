# DeepSonar

Self-hosted semantic search service for MySQL databases. Connect any MySQL table, embed it with a local AI model, and search by meaning - not just keywords.

A user searching **"wireless headphones"** finds **"Bluetooth earbuds"** and **"wireless earphones"** because the model understands they refer to the same thing. No cloud API. No per-query cost. Runs entirely on your server.

## How it works

```
Your app  →  X-API-Key  →  POST /api/sessions  →  get session token
Your app  →  X-Session-Token  →  GET /api/search?q=...  →  ranked results
```

1. Register your MySQL table in the admin dashboard
2. Trigger ingest - DeepSonar embeds every row using a local Ollama model
3. Call the search API from any application - returns semantically ranked results

## Features

- **Semantic search** - finds results by meaning, not exact string match
- **Any MySQL table** - point it at existing data, no schema changes required
- **Local AI** - uses `nomic-embed-text` or `mxbai-embed-large` via Ollama (no external API calls)
- **Multi-project** - manage multiple databases from one dashboard
- **Team access** - role-based admin accounts (Super Admin / Admin / Viewer)
- **Session-based auth** - each consumer project authenticates with its own API key

## Stack

- **Next.js 16** (App Router) - admin UI + API in one process
- **MySQL 5.7-8.0** - metadata store + vector storage (MEDIUMTEXT columns)
- **Prisma 6** - schema and migrations
- **Ollama** - local embedding model server
- **Cosine similarity** - pure in-process, no vector DB needed (scales to ~50k rows)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env.local
# Edit .env.local - fill in DATABASE_URL, ENCRYPTION_KEY, NEXTAUTH_SECRET

# 3. Run database migrations
pnpm run db:migrate:dev

# 4. Install Ollama and pull the embedding model
# Download from https://ollama.com
ollama pull nomic-embed-text

# 5. Start dev server
pnpm run dev

# 6. Visit http://localhost:3000/setup to create the first admin account
```

## Production deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full VPS setup with PM2 + Nginx.

```bash
pnpm run setup    # generate Prisma client + deploy migrations
pnpm run build
pnpm start
```

## Project structure

```
deep-sonar/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sessions/        # POST - create session
│   │   │   │   └── [token]/     # DELETE - invalidate session
│   │   │   ├── search/          # GET  - semantic search
│   │   │   ├── ingest/          # POST - trigger embedding
│   │   │   ├── health/          # GET  - health check
│   │   │   └── admin/           # Admin API (projects, stats, logs, users)
│   │   ├── (admin)/             # Dashboard UI pages
│   │   ├── login/
│   │   └── setup/
│   └── lib/
│       ├── prisma.ts            # Prisma client singleton
│       ├── crypto.ts            # AES-256-GCM encrypt/decrypt
│       ├── ollama.ts            # Ollama embedding calls
│       ├── vector-cache.ts      # In-memory vector cache with TTL
│       ├── cosine.ts            # Cosine similarity
│       ├── ingest.ts            # Embedding generation + write-back
│       └── admin-auth.ts        # Admin user auth (scrypt + HMAC sessions)
├── prisma/
│   └── schema.prisma
├── assets/
├── docs/
├── .env.example
└── package.json
```

## Documentation

| File | Contents |
|---|---|
| [`docs/API.md`](docs/API.md) | External API endpoints (sessions, search, ingest) |
| [`docs/architecture.md`](docs/architecture.md) | System design, data flow, security model |
| [`docs/database.md`](docs/database.md) | Prisma schema, MySQL table definitions |
| [`docs/dashboard.md`](docs/dashboard.md) | Admin UI pages and admin route handlers |
| [`docs/deployment.md`](docs/deployment.md) | VPS setup, PM2, Nginx, Ollama |
| [`docs/ingestion.md`](docs/ingestion.md) | How embeddings are generated and stored |

## Requirements

- Node.js 20+
- MySQL 5.7-8.0+
- Ollama (local, same machine or reachable via network)
- 2 vCPU / 4 GB RAM minimum (for `nomic-embed-text`)

## License

MIT
