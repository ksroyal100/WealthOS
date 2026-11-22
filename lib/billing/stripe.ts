import { createHmac, timingSafeEqual } from 'crypto';
import { fromCents } from '@/lib/money';

/** Verifies a Stripe-Signature header (scheme v1: HMAC-SHA256 over `${t}.${payload}`) with replay protection. */
export function verifyStripeSignature(secret: string, header: string, payload: string, now = Date.now(), toleranceSec = 300): boolean {
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || sigs.length === 0 || !/^\d+$/.test(t)) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => { try { const b = Buffer.from(s, 'hex'); return b.length === expected.length && timingSafeEqual(b, expected); } catch { return false; } });
}

const ZERO = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const THREE = new Set(['bhd', 'iod', 'jod', 'kwd', 'lyd', 'omr', 'tnd']);

/** Stripe minor units -> decimal string. Only 2-decimal currencies are supported; others return null (never guess). */
export function stripeAmount(minor: unknown, currency: unknown): { amount: string; currency: string } | null {
  if (typeof minor !== 'number' || !Number.isInteger(minor) || minor < 0 || typeof currency !== 'string') return null;
  const c = currency.toLowerCase();
  if (!/^[a-z]{3}$/.test(c) || ZERO.has(c) || THREE.has(c)) return null;
  return { amount: fromCents(BigInt(minor)), currency: c.toUpperCase() };
}
