# Sending Finora metrics to the Command Center

Finora (or any product) posts **aggregates only** (no personal data), once per day or hourly, signed with a shared secret.

1. Choose a long random secret. In WealthOS set `INGEST_SECRET_FINORA=<secret>`. In Finora set the same value as `WEALTHOS_INGEST_SECRET`.
2. Run a scheduled job inside Finora that calls the snippet below with numbers computed from Finora's own database.

```ts
import { createHmac } from 'crypto';

export async function reportToWealthOS(m: {
  day: string;                 // 'YYYY-MM-DD' (UTC)
  total_users?: number; active_users?: number; new_registrations?: number;
  active_subscriptions?: number; cancellations?: number;
  mrr?: string;                // decimal string, for example '1250.50'
  currency?: string; health?: 'healthy' | 'degraded' | 'down';
}) {
  const body = JSON.stringify(m);
  const ts = String(Date.now());
  const sig = createHmac('sha256', process.env.WEALTHOS_INGEST_SECRET!).update(`${ts}.${body}`).digest('hex');
  const res = await fetch('https://YOUR-WEALTHOS-DOMAIN/api/ingest/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-product': 'finora', 'x-timestamp': ts, 'x-signature': sig },
    body,
  });
  if (!res.ok) throw new Error(`WealthOS ingest failed: ${res.status}`);
}
```

Rules: no emails, names or transaction details. Unknown fields are rejected. A `health: 'down'` report opens a critical alert. If no report arrives for 48 hours the data source is marked stale and an alert opens.
