import mysql, { type RowDataPacket } from "mysql2/promise";
import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { embed } from "./ollama";
import { invalidate, type CachedRow } from "./vector-cache";

type DbConfig = {
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
};

export type IngestResult = {
  embedded: number;
  skipped: number;
  failed: number;
  durationMs: number;
};

const BATCH = () => Number(process.env.INGEST_BATCH_SIZE ?? 10);
const ingestLocks = new Set<string>();

export function isIngestRunning(projectId: string): boolean {
  return ingestLocks.has(projectId);
}

async function openClientConn(dbConfigEnc: string): Promise<mysql.Connection> {
  const cfg: DbConfig = JSON.parse(decrypt(dbConfigEnc));
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port ?? 3306,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
  });
}

export async function loadProjectVectors(project: {
  dbConfigEnc: string;
  tableName: string;
  idColumn: string;
  vectorColumn: string;
}): Promise<CachedRow[]> {
  const conn = await openClientConn(project.dbConfigEnc);
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT * FROM \`${project.tableName}\` WHERE embedded_at IS NOT NULL`
    );
    return rows.map((row) => {
      const raw = row[project.vectorColumn] as string | null;
      const embedding: number[] = raw ? (JSON.parse(raw) as number[]) : [];
      const data = { ...row } as Record<string, unknown>;
      delete data[project.vectorColumn];
      delete data.embedded_at;
      return { id: row[project.idColumn] as number | string, embedding, data };
    });
  } finally {
    await conn.end();
  }
}

export async function runIngest(projectId: string): Promise<IngestResult> {
  if (ingestLocks.has(projectId)) throw new Error("INGEST_RUNNING");
  ingestLocks.add(projectId);
  const start = Date.now();

  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    const conn = await openClientConn(project.dbConfigEnc);

    try {
      for (const [col, def] of [
        [project.vectorColumn, "MEDIUMTEXT NULL"],
        ["embedded_at", "DATETIME NULL"],
      ] as [string, string][]) {
        try {
          await conn.execute(
            `ALTER TABLE \`${project.tableName}\` ADD COLUMN \`${col}\` ${def}`
          );
        } catch (e: unknown) {
          if ((e as { errno?: number }).errno !== 1060) throw e;
        }
      }

      const [[{ already }]] = (await conn.execute(
        `SELECT COUNT(*) AS already FROM \`${project.tableName}\` WHERE embedded_at IS NOT NULL`
      )) as [RowDataPacket[], unknown];
      const skipped = Number(already);

      const [toEmbed] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM \`${project.tableName}\` WHERE embedded_at IS NULL`
      );

      let embedded = 0;
      let failed = 0;

      for (let i = 0; i < toEmbed.length; i += BATCH()) {
        const batch = toEmbed.slice(i, i + BATCH());
        await Promise.all(
          batch.map(async (row) => {
            try {
              const text = String(row[project.textColumn] ?? "").trim();
              if (!text) { failed++; return; }
              const vector = await embed(text);
              await conn.execute(
                `UPDATE \`${project.tableName}\`
                  SET \`${project.vectorColumn}\` = ?, \`embedded_at\` = NOW()
                  WHERE \`${project.idColumn}\` = ?`,
                [JSON.stringify(vector), row[project.idColumn]]
              );
              embedded++;
            } catch {
              failed++;
            }
          })
        );
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { vectorCount: skipped + embedded, lastIngestedAt: new Date() },
      });

      invalidate(projectId);

      return { embedded, skipped, failed, durationMs: Date.now() - start };
    } finally {
      await conn.end();
    }
  } finally {
    ingestLocks.delete(projectId);
  }
}
