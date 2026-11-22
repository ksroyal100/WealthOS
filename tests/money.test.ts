import { describe, it, expect } from 'vitest';
import { toCents, fromCents, sumMoney, formatMoney } from '@/lib/money';

describe('money', () => {
  it('sums decimals without float error', () => { expect(sumMoney(['0.10', '0.20'])).toBe('0.30'); });
  it('round-trips', () => { expect(fromCents(toCents('1234.5'))).toBe('1234.50'); expect(fromCents(toCents('-0.05'))).toBe('-0.05'); });
  it('rejects bad input', () => { expect(() => toCents('1e3')).toThrow(); expect(() => toCents('1.234')).toThrow(); expect(() => toCents('abc')).toThrow(); });
  it('formats', () => { expect(formatMoney('1234567.8', 'USD')).toBe('USD 1,234,567.80'); });
});
