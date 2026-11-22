// In-memory fixed window. Adequate for one instance; swap for Upstash/Redis when running multiple instances.
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return true; }
  h.n += 1;
  return h.n <= max;
}

/** Counts events in a rolling window and returns the new count. Used for failed-login detection. */
const counters = new Map<string, { n: number; reset: number }>();
export function bump(key: string, windowMs: number): number {
  const now = Date.now(); const c = counters.get(key);
  if (!c || c.reset < now) { counters.set(key, { n: 1, reset: now + windowMs }); return 1; }
  c.n += 1; return c.n;
}
export function resetCounter(key: string) { counters.delete(key); }
