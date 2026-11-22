import { describe, it, expect } from 'vitest';
import fs from 'fs';

const css = fs.readFileSync('app/(public)/public.css', 'utf8');
const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const full = (h: string) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h);
const vars = (block: string) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{3,6})\b/g)].map((m) => [m[1], full(m[2])]));
const light = vars(css.slice(css.indexOf('.wos {'), css.indexOf('@media (prefers-color-scheme: dark)')));
const darkStart = css.indexOf('@media (prefers-color-scheme: dark) { .wos {'); const dark = { ...light, ...vars(css.slice(darkStart, css.indexOf('\n', darkStart))) };

// Reads the real stylesheet, so a future palette change that breaks accessibility fails the build.
describe.each([['light', light], ['dark', dark]] as const)('public theme contrast (%s)', (_n, t) => {
  const pairs: [string, string, string][] = [['ink', 'bg', 'body text'], ['ink', 'bg2', 'text on tinted sections'], ['soft', 'bg', 'secondary text'], ['soft', 'bg2', 'secondary text on tint'], ['soft', 'card', 'secondary text on cards'], ['acc', 'bg', 'links and accents'], ['acc', 'bg2', 'accent on tint'], ['acc', 'card', 'accent on cards'], ['on-acc', 'acc', 'primary button text'], ['acc', 'mint', 'accent on mint']];
  it.each(pairs)('%s on %s meets WCAG AA (%s)', (fg, bg) => { expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5); });
});
describe('always-dark sections', () => {
  it('hero, security band and call to action stay readable', () => { for (const [fg, bg] of [['#F5F5F7', '#050607'], ['#B7BFC2', '#050607'], ['#A8AEB2', '#050607'], ['#34D9A5', '#050607'], ['#04120D', '#34D9A5'], ['#B7C4CC', '#0B1620'], ['#9FB0B5', '#050607'], ['#050607', '#FFFFFF']]) expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5); });
});
