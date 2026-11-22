/** Same-origin check for cookie-authenticated state-changing route handlers (defense in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try { return !!host && new URL(origin).host === host; } catch { return false; }
}
