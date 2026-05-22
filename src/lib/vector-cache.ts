export type CachedRow = {
  id: number | string;
  embedding: number[];
  data: Record<string, unknown>;
};

type Entry = {
  rows: CachedRow[];
  timer: ReturnType<typeof setInterval>;
};

const cache = new Map<string, Entry>();
const TTL = () => Number(process.env.VECTOR_CACHE_TTL_MS ?? 300_000);

export async function getOrLoad(
  projectId: string,
  loader: () => Promise<CachedRow[]>
): Promise<CachedRow[]> {
  const hit = cache.get(projectId);
  if (hit) return hit.rows;

  const rows = await loader();

  const timer = setInterval(async () => {
    try {
      const fresh = await loader();
      const e = cache.get(projectId);
      if (e) e.rows = fresh;
    } catch {
      // keep stale on transient error
    }
  }, TTL());

  cache.set(projectId, { rows, timer });
  return rows;
}

export function invalidate(projectId: string): void {
  const e = cache.get(projectId);
  if (e) {
    clearInterval(e.timer);
    cache.delete(projectId);
  }
}
