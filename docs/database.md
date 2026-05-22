# Database

## Overview

One MySQL instance serves two purposes:

1. **Meta DB** - projects, sessions, usage logs (owned by this service)
2. **Client data** - the tables inside each registered project's DB that get searched

These may be the same MySQL server or different servers. The app connects to client DBs dynamically using the decrypted config stored per project.

## Prisma schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Project {
  id             String    @id @default(cuid())
  name           String
  slug           String    @unique           // e.g. "catalog", "inventory"
  apiKey         String    @unique           // ds_catalog_K8mXq2…
  dbConfigEnc    String    @db.Text          // AES-256-GCM encrypted JSON
  tableName      String                      // table to search
  textColumn     String                      // column to embed
  idColumn       String                      // primary key column
  vectorColumn   String    @default("embedding") // where vectors are stored
  vectorCount    Int       @default(0)
  lastIngestedAt DateTime?
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  sessions  Session[]
  usageLogs UsageLog[]
}

model Session {
  id        String   @id                    // nanoid - the actual token
  projectId String
  expiresAt DateTime
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([expiresAt])
}

model UsageLog {
  id        String   @id @default(cuid())
  projectId String
  query     String   @db.VarChar(1000)
  results   Int
  topScore  Float?
  latencyMs Int
  loggedAt  DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([loggedAt])
}
```

## Client DB: vector storage

Each registered project's MySQL table needs an `embedding` column (or whatever `vectorColumn` is set to) added. The ingest script handles this automatically:

```sql
ALTER TABLE `{tableName}`
  ADD COLUMN `embedding`    MEDIUMTEXT  NULL,
  ADD COLUMN `embedded_at`  DATETIME    NULL;
```

Vectors are stored as JSON arrays: `[0.023, -0.141, 0.887, ...]`  
Size per row: ~768 floats × 8 bytes = ~6 KB  
Total for 1,500 rows: ~9 MB - fits comfortably in memory

## Migrations

```bash
# Create a new migration after editing schema.prisma
npx prisma migrate dev --name init

# Apply migrations on the VPS (production)
npx prisma migrate deploy

# Open Prisma Studio (local dev only)
npx prisma studio
```

## Indexes

Sessions are queried by `id` (token lookup) and by `expiresAt` (cleanup job).  
UsageLogs are queried by `projectId` and `loggedAt` for dashboard stats.  
Both indexes are defined in the schema above.

## Session cleanup

Expired sessions are pruned by a background interval in `lib/prisma.ts` (runs inside the Next.js process):

```ts
// lib/prisma.ts
setInterval(async () => {
  await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
}, 60 * 60 * 1000); // every hour
```
