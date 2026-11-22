export type Category = 'contract' | 'agreement' | 'policy' | 'corporate' | 'hr' | 'technical' | 'other';
export type Confidentiality = 'internal' | 'restricted' | 'confidential';

/** Which permission resource guards a document. Confidential documents need their own, rarely granted, permission. */
export function docResource(category: string, confidentiality: string): 'legal' | 'legal_confidential' | 'hr' {
  if (confidentiality === 'confidential') return 'legal_confidential';
  if (category === 'hr') return 'hr';
  return 'legal';
}

export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/png': 'png', 'image/jpeg': 'jpg', 'text/plain': 'txt',
};
export const MAX_BYTES = 10 * 1024 * 1024;

/** Checks the first bytes so a file cannot pretend to be a different type. */
export function magicOk(mime: string, b: Uint8Array): boolean {
  const starts = (...sig: number[]) => sig.every((x, i) => b[i] === x);
  switch (mime) {
    case 'application/pdf': return starts(0x25, 0x50, 0x44, 0x46);
    case 'image/png': return starts(0x89, 0x50, 0x4e, 0x47);
    case 'image/jpeg': return starts(0xff, 0xd8, 0xff);
    case 'text/plain': return !Array.from(b.slice(0, 1024)).includes(0);
    default: return starts(0x50, 0x4b, 0x03, 0x04);              // docx / xlsx are zip containers
  }
}
export const safeFilename = (n: string) => n.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'file';
