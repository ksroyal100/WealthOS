export const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"><h2 className="mb-3 text-sm font-medium text-[#4A5A6A]">{title}</h2>{children}</section>
);
export const Unavailable = ({ what }: { what: string }) => (
  <p className="text-sm text-[#9A6410]">{what} is not connected. No figures are shown until a verified source reports.</p>
);
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm">{label}<div className="mt-1">{children}</div></label>
);
export const inputCls = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm';
export const btnCls = 'rounded-full bg-[#0A7A5C] px-5 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
