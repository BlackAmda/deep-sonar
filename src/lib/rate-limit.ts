// NOTE: Bucket state is process-local. In multi-process deployments (PM2 cluster,
// multiple Docker replicas), each process has its own counter — effective limit is
// N × RATE_LIMIT_MAX per minute where N = process count. Replace with a shared
// store (Redis INCR + EXPIRE) before scaling beyond a single Node process.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX = () => Number(process.env.RATE_LIMIT_MAX ?? 100);

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (bucket.count >= MAX()) return false;
  bucket.count++;
  return true;
}
