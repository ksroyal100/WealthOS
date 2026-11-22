import { describe, it, expect } from 'vitest';
import { docResource, magicOk, safeFilename, ALLOWED_TYPES } from '@/lib/cc/doc-policy';
import { publicPath, paragraphs } from '@/lib/cms-routes';
import { errMsg } from '@/lib/cc/kit';
import { z } from 'zod';

describe('document policy', () => {
  it('confidential documents need their own permission, HR documents need HR', () => {
    expect(docResource('contract', 'confidential')).toBe('legal_confidential');
    expect(docResource('hr', 'restricted')).toBe('hr');
    expect(docResource('hr', 'confidential')).toBe('legal_confidential');
    expect(docResource('contract', 'restricted')).toBe('legal');
  });
  it('rejects files whose bytes do not match the declared type', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    expect(magicOk('application/pdf', pdf)).toBe(true); expect(magicOk('application/pdf', exe)).toBe(false); expect(magicOk('image/png', pdf)).toBe(false); expect(magicOk('image/png', png)).toBe(true);
    expect(magicOk('application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip)).toBe(true); expect(magicOk('application/vnd.openxmlformats-officedocument.wordprocessingml.document', exe)).toBe(false);
    expect(magicOk('text/plain', new Uint8Array([104, 105, 0, 1]))).toBe(false);
  });
  it('allows only the intended types and neutralises filenames', () => {
    expect(Object.keys(ALLOWED_TYPES)).not.toContain('text/html'); expect(Object.keys(ALLOWED_TYPES)).not.toContain('application/x-msdownload');
    expect(safeFilename('../../etc/passwd')).not.toContain('/'); expect(safeFilename('a<script>.pdf')).not.toContain('<'); expect(safeFilename('')).toBe('file');
  });
});

describe('cms routing and rendering', () => {
  it('maps content to public addresses and refuses unknown pages', () => {
    expect(publicPath('page', 'mission')).toBe('/mission'); expect(publicPath('page', 'random-page')).toBeNull();
    expect(publicPath('press_release', 'x')).toBe('/newsroom/x'); expect(publicPath('article', 'y')).toBe('/media/y'); expect(publicPath('policy', 'z')).toBeNull();
  });
  it('splits plain text into paragraphs and never produces HTML', () => {
    expect(paragraphs('One\n\nTwo\n\n\nThree')).toEqual(['One', 'Two', 'Three']); expect(paragraphs(null)).toEqual([]); expect(paragraphs('<b>x</b>')[0]).toBe('<b>x</b>');
  });
});

describe('error messages shown to staff', () => {
  it('shows curated database rule messages and hides internals', () => {
    expect(errMsg({ code: 'P0001', message: 'cannot approve work you created or submitted' })).toBe('cannot approve work you created or submitted');
    expect(errMsg({ code: '23505', message: 'duplicate key value violates unique constraint "x"' })).toBe('That already exists.');
    expect(errMsg({ code: '42P01', message: 'relation "cc.secret" does not exist' })).toBe('Something went wrong. Please try again.');
    expect(errMsg(new Response('no', { status: 403 }))).toMatch(/permission/);
    const bad = z.object({ a: z.string().min(3) }).safeParse({ a: 'x' }); if (!bad.success) expect(errMsg(bad.error)).toMatch(/^a:/);
  });
});
