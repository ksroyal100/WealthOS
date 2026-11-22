'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { State } from '@/lib/cc/kit';

/** Form for the public site and customer portal: pending state, inline messages, optional redirect. */
export default function PublicForm({ action, children, submit }: { action: (p: State, fd: FormData) => Promise<State>; children: React.ReactNode; submit: string }) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const ref = useRef<HTMLFormElement>(null); const router = useRouter();
  useEffect(() => { if (state.ok && !state.redirect) ref.current?.reset(); if (state.redirect) router.push(state.redirect); }, [state, router]);
  return (
    <form ref={ref} action={formAction} aria-busy={pending}>
      {children}
      <button className="btn solid" disabled={pending}>{pending ? 'Sending…' : submit}</button>
      {state.error && <p role="alert" className="err" style={{ marginTop: 12 }}>{state.error}</p>}
      {state.ok && state.message && <p role="status" className="ok" style={{ marginTop: 12 }}>{state.message}</p>}
    </form>
  );
}
