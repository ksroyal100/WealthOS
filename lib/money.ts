// Money crosses the app as decimal STRINGS (Postgres numeric). Never use floats for arithmetic.
export function toCents(v: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) throw new Error('invalid money value');
  const neg = v.startsWith('-');
  const [w, f = ''] = v.replace('-', '').split('.');
  const c = BigInt(w) * 100n + BigInt(f.padEnd(2, '0'));
  return neg ? -c : c;
}
export function fromCents(c: bigint): string {
  const neg = c < 0n; const a = neg ? -c : c;
  return `${neg ? '-' : ''}${a / 100n}.${(a % 100n).toString().padStart(2, '0')}`;
}
export const sumMoney = (vals: string[]) => fromCents(vals.reduce((s, v) => s + toCents(v), 0n));
export function formatMoney(v: string, currency = 'USD'): string {
  const c = toCents(v);
  const whole = (c < 0n ? -c : c) / 100n;
  const frac = ((c < 0n ? -c : c) % 100n).toString().padStart(2, '0');
  return `${c < 0n ? '-' : ''}${currency} ${whole.toLocaleString('en-US')}.${frac}`;
}
