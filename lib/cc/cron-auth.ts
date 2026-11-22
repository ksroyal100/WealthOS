import { timingSafeEqual } from 'crypto';
export function cronAuthorized(req: Request) {
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ''}`);
  return !!process.env.CRON_SECRET && given.length === want.length && timingSafeEqual(given, want);
}
