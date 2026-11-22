import Link from 'next/link';

export const STATUS_LABEL: Record<string, string> = { live: 'Live', beta: 'Beta', coming_soon: 'Coming soon' };
export type CatalogProduct = { slug: string; name: string; tagline: string | null; category: string; status: string };

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge b-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function ProductCard({ p }: { p: CatalogProduct }) {
  return (
    <Link href={`/marketplace/${p.slug}`} className="pcard">
      <span className="orb" aria-hidden="true" />
      <div className="top"><span>{p.category}</span><StatusBadge status={p.status} /></div>
      <div style={{ position: 'relative', fontSize: '.88rem', color: 'var(--soft)' }}>WealthOS presents</div>
      <h3>{p.name}</h3>
      <p>{p.tagline}</p>
      <span className="go">{p.status === 'coming_soon' ? 'Learn more' : 'View product'}</span>
    </Link>
  );
}
