'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission, requireStaff, type Action } from '@/lib/cc/authz';
import { admin } from '@/lib/supabase/admin';
import { ledgerEntry, productInput, projectInput, taskInput, contentInput, publicationInput, planInput, invoiceInput, budgetInput } from '@/lib/cc/schemas';

const blank = <T extends Record<string, any>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined)) as T;
const form = (fd: FormData) => Object.fromEntries(fd.entries());
const log = (actor: string, action: string, resource: string, record: string | null, outcome = 'success') =>
  admin().from('audit_log').insert({ actor_id: actor, action, resource, record_id: record, outcome });

async function notify(userIds: string[], title: string, body: string) {
  if (!userIds.length) return;
  await admin().from('notifications').insert(userIds.map((user_id) => ({ user_id, title, body })));
}
async function approvers(exclude: string): Promise<string[]> {
  const { data } = await admin().from('staff_roles').select('user_id, roles!inner(key), staff_members!inner(status)').in('roles.key', ['ceo', 'cfo']).eq('staff_members.status', 'active');
  return [...new Set((data ?? []).map((r: any) => r.user_id as string))].filter((u) => u !== exclude);
}

async function guard(resource: string, action: Action) { return requirePermission(resource, action); }

export async function addLedgerEntry(fd: FormData) {
  const s = await guard('finance', 'create');
  const { vendor, ...v } = ledgerEntry.parse(form(fd));
  let vendor_id: string | undefined;
  if (vendor) { const { data: vd } = await admin().from('vendors').upsert({ name: vendor }, { onConflict: 'name' }).select('id').single(); vendor_id = vd?.id; }
  const { data, error } = await admin().from('ledger_entries').insert({ ...blank(v), vendor_id, created_by: s.userId, source: 'manual' }).select('id').single();
  if (error) throw new Error('Could not save entry');
  await log(s.userId, 'create', 'ledger_entry', data.id);
  revalidatePath('/command-center/finance');
}

export async function registerProduct(fd: FormData) {
  const s = await guard('products', 'create');
  const v = productInput.parse(form(fd));
  const db = admin();
  const { data, error } = await db.from('products').insert({ ...blank(v), owner_id: s.userId, status: 'planned' }).select('id').single();
  if (error) throw new Error('Could not register product (slug may already exist)');
  await db.from('data_sources').insert({ product_id: data.id, kind: `${v.slug}_metrics`, status: 'disconnected' });
  // Draft listing for the public marketplace. Stays hidden until someone with products:edit publishes it.
  await db.schema('public').from('catalog_products').insert({ slug: v.slug, name: v.name, tagline: v.description?.slice(0, 140) ?? null, category: v.category || 'General', status: 'coming_soon', published: false });
  await log(s.userId, 'create', 'product', data.id);
  revalidatePath('/command-center/products');
}

export async function createProject(fd: FormData) {
  const s = await guard('projects', 'create');
  const v = projectInput.parse(form(fd));
  const db = admin();
  const { data, error } = await db.from('projects').insert({ ...blank(v), owner_id: s.userId }).select('id').single();
  if (error) throw new Error('Could not create project');
  await db.from('project_members').insert({ project_id: data.id, user_id: s.userId });
  await log(s.userId, 'create', 'project', data.id);
  revalidatePath('/command-center/projects');
}

export async function createTask(fd: FormData) {
  const s = await guard('tasks', 'create');
  const v = taskInput.parse(form(fd));
  const { data, error } = await admin().from('tasks').insert(blank(v)).select('id').single();
  if (error) throw new Error('Could not create task');
  await log(s.userId, 'create', 'task', data.id);
  revalidatePath('/command-center/projects');
}

export async function setTaskStatus(fd: FormData) {
  const s = await guard('tasks', 'edit');
  const v = z.object({ id: z.string().uuid(), status: z.enum(['todo', 'in_progress', 'blocked', 'done']), blocked_reason: z.string().max(300).optional() }).parse(form(fd));
  const patch: Record<string, unknown> = { status: v.status, completed_at: v.status === 'done' ? new Date().toISOString() : null };
  if (v.status === 'blocked') patch.blocked_reason = v.blocked_reason || 'No reason given';
  await admin().from('tasks').update(patch).eq('id', v.id);
  await log(s.userId, 'edit', 'task', v.id);
  revalidatePath('/command-center/projects');
}

export async function addContentItem(fd: FormData) {
  const s = await guard('media', 'create');
  const v = contentInput.parse(form(fd));
  const { data, error } = await admin().from('content_items').insert({ ...blank(v), assignee_id: s.userId }).select('id').single();
  if (error) throw new Error('Could not add content');
  await log(s.userId, 'create', 'content_item', data.id);
  revalidatePath('/command-center/media');
}

export async function setContentStatus(fd: FormData) {
  const s = await guard('media', 'edit');
  const v = z.object({ id: z.string().uuid(), status: z.enum(['idea', 'in_production', 'review', 'scheduled', 'published']) }).parse(form(fd));
  // Publishing is an approval-level action.
  if (v.status === 'published') await guard('media', 'approve');
  await admin().from('content_items').update({ status: v.status }).eq('id', v.id);
  await log(s.userId, 'edit', 'content_item', v.id);
  revalidatePath('/command-center/media');
}

export async function resolveAlert(fd: FormData) {
  const s = await guard('security', 'edit');
  const id = z.string().uuid().parse(fd.get('id'));
  await admin().from('alerts').update({ resolved_at: new Date().toISOString() }).eq('id', id);
  await log(s.userId, 'resolve', 'alert', id);
  revalidatePath('/command-center');
}

export async function saveSchedule(fd: FormData) {
  const s = await guard('reports', 'edit');
  const v = z.object({ kind: z.enum(['daily', 'weekly', 'monthly']), recipients: z.string().max(500) }).parse(form(fd));
  const list = v.recipients.split(',').map((x) => x.trim()).filter(Boolean);
  list.forEach((e) => z.string().email().parse(e));
  await admin().from('report_schedules').update({ enabled: fd.get('enabled') === 'on', recipients: list }).eq('kind', v.kind);
  await log(s.userId, 'edit', 'report_schedule', v.kind);
  revalidatePath('/command-center/reports');
}

export async function setCatalogListing(fd: FormData) {
  const s = await guard('products', 'edit');
  const v = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/), status: z.enum(['live', 'beta', 'coming_soon']) }).parse(form(fd));
  const published = fd.get('published') === 'on';
  if (published) await guard('products', 'approve');            // going public is an approval-level action
  await admin().schema('public').from('catalog_products').update({ status: v.status, published }).eq('slug', v.slug);
  await log(s.userId, published ? 'publish' : 'unpublish', 'catalog_product', v.slug);
  revalidatePath('/command-center/products'); revalidatePath('/marketplace'); revalidatePath('/');
}

export async function markAllRead() {
  const s = await requireStaff();
  await admin().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', s.userId).is('read_at', null);
  revalidatePath('/command-center/notifications'); revalidatePath('/command-center');
}

export async function savePublication(fd: FormData) {
  const v = publicationInput.parse(Object.fromEntries([...fd.entries()].filter(([k]) => k !== 'published')));
  const db = admin().schema('public');
  const { data: ex } = await db.from('publications').select('slug').eq('slug', v.slug).maybeSingle();
  const s = await guard('media', ex ? 'edit' : 'create');
  const { error } = await db.from('publications').upsert({ ...v, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  if (error) throw new Error('Could not save publication');
  await log(s.userId, ex ? 'edit' : 'create', 'publication', v.slug);
  revalidatePath('/command-center/publications');
}

export async function setPublicationPublished(fd: FormData) {
  const s = await guard('media', 'approve');                     // publishing to the public site is approval-level
  const slug = z.string().regex(/^[a-z0-9-]{3,80}$/).parse(fd.get('slug'));
  const published = fd.get('published') === 'on';
  const db = admin().schema('public');
  const { data: cur } = await db.from('publications').select('published_at').eq('slug', slug).maybeSingle();
  await db.from('publications').update({ published, published_at: published ? (cur?.published_at ?? new Date().toISOString()) : cur?.published_at ?? null }).eq('slug', slug);
  await log(s.userId, published ? 'publish' : 'unpublish', 'publication', slug);
  revalidatePath('/command-center/publications'); revalidatePath('/media'); revalidatePath(`/media/${slug}`); revalidatePath('/');
}

export async function deletePublication(fd: FormData) {
  const s = await guard('media', 'delete');
  const slug = z.string().regex(/^[a-z0-9-]{3,80}$/).parse(fd.get('slug'));
  await admin().schema('public').from('publications').delete().eq('slug', slug);
  await log(s.userId, 'delete', 'publication', slug);
  revalidatePath('/command-center/publications'); revalidatePath('/media');
}

export async function addPlan(fd: FormData) {
  const s = await guard('products', 'edit');
  const v = planInput.parse(form(fd));
  const features = (v.features ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12).map((x) => x.slice(0, 120));
  const { error } = await admin().schema('public').from('catalog_plans').insert({ product_slug: v.product_slug, name: v.name, price: v.billing_interval === 'free' ? '0' : v.price, currency: v.currency.toUpperCase(), billing_interval: v.billing_interval, features, checkout_url: v.checkout_url || null });
  if (error) throw new Error('Could not add plan');
  await log(s.userId, 'create', 'plan', v.product_slug);
  revalidatePath(`/command-center/products/${v.product_slug}`); revalidatePath(`/marketplace/${v.product_slug}`);
}

export async function deletePlan(fd: FormData) {
  const s = await guard('products', 'edit');
  const v = z.object({ id: z.string().uuid(), product_slug: z.string().regex(/^[a-z0-9-]{2,40}$/) }).parse(form(fd));
  await admin().schema('public').from('catalog_plans').delete().eq('id', v.id);
  await log(s.userId, 'delete', 'plan', v.id);
  revalidatePath(`/command-center/products/${v.product_slug}`); revalidatePath(`/marketplace/${v.product_slug}`);
}

export async function createInvoice(fd: FormData) {
  const s = await guard('finance', 'create');
  const v = invoiceInput.parse(form(fd));
  const { data, error } = await admin().from('invoices').insert({ ...blank(v), created_by: s.userId }).select('id').single();
  if (error) throw new Error('Could not create invoice (number may already exist)');
  await log(s.userId, 'create', 'invoice', data.id);
  revalidatePath('/command-center/finance/invoices');
}

export async function setInvoiceStatus(fd: FormData) {
  const s = await guard('finance', 'edit');
  const v = z.object({ id: z.string().uuid(), status: z.enum(['open', 'paid', 'void']) }).parse(form(fd));
  await admin().from('invoices').update({ status: v.status }).eq('id', v.id);
  await log(s.userId, 'edit', 'invoice', v.id);
  revalidatePath('/command-center/finance/invoices');
}

export async function saveBudget(fd: FormData) {
  const s = await guard('finance', 'create');
  const v = budgetInput.parse(form(fd));
  const month = `${v.month}-01`; const db = admin();
  const { data: ex } = await db.from('budgets').select('id').eq('month', month).eq('category', v.category).is('product_id', null).maybeSingle();
  if (ex) await db.from('budgets').update({ amount: v.amount, currency: v.currency.toUpperCase() }).eq('id', ex.id);
  else await db.from('budgets').insert({ month, category: v.category, amount: v.amount, currency: v.currency.toUpperCase() });
  await log(s.userId, 'edit', 'budget', `${month}:${v.category}`);
  revalidatePath('/command-center/finance/budgets');
}
