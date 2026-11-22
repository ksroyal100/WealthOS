export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const reviewed = process.env.NEXT_PUBLIC_LEGAL_REVIEWED === 'true';
  return (
    <section className="sec"><div className="wrap prose" style={{ maxWidth: 780 }}>
      {!reviewed && <div className="draftbanner" role="note">Draft for attorney review. Items in [brackets] must be confirmed or replaced before launch. This banner disappears when NEXT_PUBLIC_LEGAL_REVIEWED is set to true.</div>}
      <h1 className="serif" style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', margin: 0, fontWeight: 600 }}>{title}</h1>
      <p style={{ color: 'var(--soft)' }}>Last updated: {updated}</p>
      {children}
    </div></section>
  );
}
