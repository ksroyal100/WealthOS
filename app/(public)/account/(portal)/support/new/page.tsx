import { requireCustomer } from '@/lib/account/session';
import PublicForm from '@/components/public-form';
import { createSupportRequest } from '@/lib/public/actions';
export const metadata = { title: 'New support request', robots: { index: false } };

export default async function NewRequest() {
  await requireCustomer();
  return (
    <div className="stack"><div className="pgreet"><h1>New support request</h1><p className="muted">Describe the problem and we will reply here. Please do not include passwords or full card numbers.</p></div>
      <div className="panel"><PublicForm action={createSupportRequest} submit="Send request">
        <label className="field">Subject<input name="subject" required minLength={3} maxLength={160} className="input" /></label>
        <label className="field">Category<select name="category" className="input" defaultValue="general"><option value="general">General</option><option value="billing">Billing</option><option value="account">Account</option><option value="technical">Technical</option><option value="privacy">Privacy</option></select></label>
        <label className="field">Message<textarea name="body" required minLength={5} maxLength={4000} rows={6} className="input" style={{ padding: 12, minHeight: 140 }} /></label>
      </PublicForm></div></div>
  );
}
