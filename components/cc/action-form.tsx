'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { State } from '@/lib/cc/kit';

type Props = { action: (prev: State, fd: FormData) => Promise<State>; children: React.ReactNode; submit: string; className?: string; resetOnSuccess?: boolean; danger?: boolean; compact?: boolean };

/** Form with a pending state, inline success and error messages, and optional redirect. Used by every module screen. */
export default function ActionForm({ action, children, submit, className, resetOnSuccess = true, danger, compact }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => { if (state.ok && resetOnSuccess) ref.current?.reset(); if (state.redirect) router.push(state.redirect); }, [state, resetOnSuccess, router]);
  return (
    <form ref={ref} action={formAction} className={className ?? 'grid gap-3 md:grid-cols-3'} aria-busy={pending}>
      {children}
      <div className={compact ? 'flex flex-wrap items-center gap-3' : 'flex flex-wrap items-center gap-3 md:col-span-3'}>
        <button disabled={pending} className={`rounded-full px-5 py-2.5 text-sm font-medium text-white transition active:scale-[.98] disabled:opacity-60 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0A7A5C] hover:bg-[#086649]'}`}>{pending ? 'Working…' : submit}</button>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        {state.ok && state.message && !pending && <p role="status" className="text-sm text-green-800">{state.message}</p>}
      </div>
    </form>
  );
}
