export function GET() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (!email) return new Response('Not found', { status: 404 });
  const exp = new Date(Date.now() + 300 * 86400_000).toISOString();
  return new Response(`Contact: mailto:${email}\nExpires: ${exp}\nPreferred-Languages: en\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
