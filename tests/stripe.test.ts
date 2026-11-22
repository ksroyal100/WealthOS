import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyStripeSignature, stripeAmount } from '@/lib/billing/stripe';

const secret = 'whsec_test'; const now = 1_700_000_000_000;
const header = (payload: string, t = Math.floor(now / 1000), s = secret) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${payload}`).digest('hex')}`;

describe('stripe webhook signature', () => {
  const body = '{"id":"evt_1"}';
  it('accepts a valid signature', () => expect(verifyStripeSignature(secret, header(body), body, now)).toBe(true));
  it('rejects tampered body, wrong secret, stale timestamp, garbage', () => {
    expect(verifyStripeSignature(secret, header(body), body + ' ', now)).toBe(false);
    expect(verifyStripeSignature(secret, header(body, undefined, 'other'), body, now)).toBe(false);
    expect(verifyStripeSignature(secret, header(body, Math.floor(now / 1000) - 3600), body, now)).toBe(false);
    expect(verifyStripeSignature(secret, 'nonsense', body, now)).toBe(false);
    expect(verifyStripeSignature(secret, '', body, now)).toBe(false);
  });
  it('accepts when any of several v1 signatures matches', () => {
    const t = Math.floor(now / 1000); const good = header(body).split('v1=')[1];
    expect(verifyStripeSignature(secret, `t=${t},v1=deadbeef,v1=${good}`, body, now)).toBe(true);
  });
});

describe('stripe amounts', () => {
  it('converts cents exactly', () => { expect(stripeAmount(1999, 'usd')).toEqual({ amount: '19.99', currency: 'USD' }); expect(stripeAmount(5, 'eur')).toEqual({ amount: '0.05', currency: 'EUR' }); });
  it('refuses unsupported or invalid input instead of guessing', () => {
    expect(stripeAmount(1000, 'jpy')).toBeNull(); expect(stripeAmount(1000, 'kwd')).toBeNull();
    expect(stripeAmount(-1, 'usd')).toBeNull(); expect(stripeAmount(1.5, 'usd')).toBeNull(); expect(stripeAmount('5', 'usd')).toBeNull(); expect(stripeAmount(5, 'us')).toBeNull();
  });
});
