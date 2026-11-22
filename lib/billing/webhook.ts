import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { stripeAmount } from '@/lib/billing/stripe';

const SLUG = /^[a-z0-9-]{2,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugOf = (...objs: any[]) => { for (const o of objs) { const s = o?.metadata?.product_slug; if (typeof s === 'string' && SLUG.test(s)) return s as string; } return null; };

/** Applies a verified Stripe event to the customer mirrors and the finance ledger. Idempotent per row. */
export async function processStripeEvent(ev: any) {
  const db = admin(); const pub = db.schema('public');
  const o = ev?.data?.object ?? {};

  const userFor = async (customer?: string | null) => {
    if (!customer) return null;
    const { data } = await pub.from('customer_billing').select('user_id').eq('stripe_customer_id', customer).maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  };
  const productId = async (slug: string | null) => {
    if (!slug) return null;
    const { data } = await db.from('products').select('id').eq('slug', slug).maybeSingle();
    return (data?.id as string | undefined) ?? null;
  };
  const ledger = async (row: Record<string, unknown>) => {
    const { error } = await db.from('ledger_entries').upsert({ source: 'stripe', created_by: null, ...row }, { onConflict: 'source,external_ref', ignoreDuplicates: true });
    if (error) throw new Error('ledger write failed');
  };
  const alert = async (kind: string, severity: 'info' | 'warning' | 'critical', message: string, source: string) => {
    const { error } = await db.from('alerts').insert({ kind, severity, message, source });
    if (error && error.code !== '23505') throw new Error('alert write failed');   // 23505 = already open
  };
  const money = async (minor: unknown, cur: unknown) => {
    const m = stripeAmount(minor, cur);
    if (!m) await alert('unsupported_currency', 'warning', 'A payment used a currency this system does not record automatically. Review it in Stripe.', 'stripe');
    return m;
  };
  const day = (sec?: number) => new Date((sec ?? Date.now() / 1000) * 1000).toISOString().slice(0, 10);

  switch (ev.type) {
    case 'checkout.session.completed': {
      const uid = typeof o.client_reference_id === 'string' && UUID.test(o.client_reference_id) ? o.client_reference_id : null;
      if (uid && o.customer) await pub.from('customer_billing').upsert({ user_id: uid, stripe_customer_id: o.customer }, { onConflict: 'user_id' });
      if (o.mode === 'payment' && o.payment_status === 'paid') {
        const m = await money(o.amount_total, o.currency); if (!m) return;
        const slug = slugOf(o);
        await pub.from('customer_orders').upsert({ id: o.id, user_id: uid ?? (await userFor(o.customer)), stripe_customer_id: o.customer ?? null, product_slug: slug, description: 'One-time purchase', amount: m.amount, currency: m.currency, status: 'paid' }, { onConflict: 'id' });
        await ledger({ product_id: await productId(slug), occurred_on: day(o.created), kind: 'revenue', category: 'sales', status: 'received', amount: m.amount, currency: m.currency, description: 'Stripe checkout', external_ref: o.id });
      }
      return;
    }
    case 'invoice.paid': {
      const m = await money(o.amount_paid, o.currency); if (!m || m.amount === '0.00') return;
      const line = o.lines?.data?.[0]; const slug = slugOf(o.subscription_details, line?.price, line);
      await pub.from('customer_orders').upsert({ id: o.id, user_id: await userFor(o.customer), stripe_customer_id: o.customer ?? null, product_slug: slug, description: line?.description ?? 'Subscription payment', amount: m.amount, currency: m.currency, status: 'paid' }, { onConflict: 'id' });
      await ledger({ product_id: await productId(slug), occurred_on: day(o.status_transitions?.paid_at ?? o.created), kind: 'revenue', category: 'subscriptions', status: 'received', amount: m.amount, currency: m.currency, description: 'Stripe invoice', external_ref: o.id });
      return;
    }
    case 'invoice.payment_failed': {
      const m = await money(o.amount_due, o.currency); if (!m) return;
      const line = o.lines?.data?.[0]; const slug = slugOf(o.subscription_details, line?.price, line);
      await pub.from('customer_orders').upsert({ id: o.id, user_id: await userFor(o.customer), stripe_customer_id: o.customer ?? null, product_slug: slug, description: 'Payment failed', amount: m.amount, currency: m.currency, status: 'failed' }, { onConflict: 'id' });
      await ledger({ product_id: await productId(slug), occurred_on: day(o.created), kind: 'revenue', category: 'subscriptions', status: 'failed', amount: m.amount, currency: m.currency, description: 'Stripe payment failed', external_ref: `${o.id}:failed` });
      await alert('payment_failed', 'warning', 'A customer payment failed. Review failed payments in Finance.', slug ?? 'stripe');
      return;
    }
    case 'charge.refunded': {
      const prev = ev.data?.previous_attributes?.amount_refunded;
      const delta = (typeof o.amount_refunded === 'number' ? o.amount_refunded : 0) - (typeof prev === 'number' ? prev : 0);   // only the newly refunded part
      if (delta <= 0) return;
      const m = await money(delta, o.currency); if (!m) return;
      const slug = slugOf(o);
      await ledger({ product_id: await productId(slug), occurred_on: day(o.created), kind: 'refund', category: 'refunds', status: 'paid', amount: m.amount, currency: m.currency, description: 'Stripe refund', external_ref: `${o.id}:refund:${o.amount_refunded}` });
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const item = o.items?.data?.[0]; const price = item?.price;
      const slug = slugOf(o, price);
      const m = stripeAmount(price?.unit_amount, price?.currency);
      const end = o.current_period_end ?? item?.current_period_end;
      await pub.from('customer_subscriptions').upsert({
        id: o.id, user_id: await userFor(o.customer), stripe_customer_id: o.customer, product_slug: slug,
        plan_name: price?.nickname ?? null, status: o.status, amount: m?.amount ?? null, currency: m?.currency ?? null,
        billing_interval: price?.recurring?.interval ?? null, current_period_end: end ? new Date(end * 1000).toISOString() : null,
        cancel_at_period_end: !!o.cancel_at_period_end, updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (ev.type === 'customer.subscription.deleted') await alert('subscription_canceled', 'warning', 'A subscription was canceled. Review churn in the product dashboard.', slug ?? 'stripe');
      return;
    }
    default: return;                                    // events we do not use are acknowledged and ignored
  }
}
