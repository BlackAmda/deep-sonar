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
