import { z } from 'zod';

export const metricsPayload = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_users: z.number().int().min(0).optional(),
  active_users: z.number().int().min(0).optional(),
  new_registrations: z.number().int().min(0).optional(),
  active_subscriptions: z.number().int().min(0).optional(),
  cancellations: z.number().int().min(0).optional(),
  mrr: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().length(3).optional(),
  health: z.enum(['healthy', 'degraded', 'down']).optional(),
  usage: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const ledgerEntry = z.object({
  product_id: z.string().uuid().optional().or(z.literal('')),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['revenue', 'refund', 'fee', 'expense']),
  category: z.string().min(1).max(60),
  status: z.enum(['estimated', 'pending', 'received', 'paid', 'failed', 'reversed']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => Number(v) > 0, 'must be positive'),
  currency: z.string().length(3).default('USD'),
  description: z.string().max(500).optional(),
  vendor: z.string().trim().max(120).optional(),
});

export const productInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  category: z.string().max(60).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  app_url: z.string().url().optional().or(z.literal('')),
});

export const projectInput = z.object({
  name: z.string().min(2).max(120), description: z.string().max(1000).optional(),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});
export const taskInput = z.object({
  project_id: z.string().uuid(), title: z.string().min(2).max(200),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});
export const contentInput = z.object({
  title: z.string().min(2).max(200), type: z.enum(['video', 'blog', 'documentary', 'research', 'news']),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.string().regex(/^\d+(\.\d{1,2})?$/);
export const publicationInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/),
  title: z.string().trim().min(3).max(160),
  category: z.enum(['documentary', 'financial_education', 'insights', 'news', 'research', 'blog', 'video']),
  summary: z.string().trim().max(300).optional(),
  body: z.string().max(50000).optional(),
  author: z.string().trim().max(80).optional(),
});
export const planInput = z.object({
  product_slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().trim().min(2).max(60),
  price: money,
  currency: z.string().length(3).default('USD'),
  billing_interval: z.enum(['free', 'month', 'year', 'one_time']),
  features: z.string().max(2000).optional(),
  checkout_url: z.string().url().refine((u) => u.startsWith('https://'), 'must be https').optional().or(z.literal('')),
});
export const invoiceInput = z.object({
  number: z.string().trim().min(1).max(40), counterparty: z.string().trim().min(2).max(120),
  direction: z.enum(['receivable', 'payable']), amount: money.refine((v) => Number(v) > 0), currency: z.string().length(3).default('USD'),
  issued_on: ymd, due_on: ymd.optional().or(z.literal('')),
});
export const budgetInput = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), category: z.string().trim().min(1).max(60), amount: money, currency: z.string().length(3).default('USD') });
