'use client';
import { useActionState, useRef } from 'react';
import type { State } from '@/lib/cc/kit';

/** A button that asks for confirmation in an accessible dialog before running a destructive or irreversible action. */
export default function ConfirmForm({ action, hidden, label, title, message, danger = true }: { action: (p: State, fd: FormData) => Promise<State>; hidden: Record<string, string>; label: string; title: string; message: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {} as State);
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dlg.current?.showModal()} className={`text-xs underline ${danger ? 'text-red-700' : ''}`}>{label}</button>
      {state.error && <span role="alert" className="ml-2 text-xs text-red-700">{state.error}</span>}
      <dialog ref={dlg} aria-labelledby="cf-title" className="rounded-3xl p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
        <form action={formAction} className="w-[min(92vw,26rem)] space-y-4 p-5" onSubmit={() => setTimeout(() => dlg.current?.close(), 0)}>
          <h2 id="cf-title" className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-700">{message}</p>
          {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => dlg.current?.close()} className="rounded-full border px-5 py-2.5 text-sm">Cancel</button>
            <button disabled={pending} className={`rounded-full px-5 py-2.5 text-sm font-medium text-white ${danger ? 'bg-red-600' : 'bg-[#0A7A5C]'}`}>{label}</button></div>
        </form>
      </dialog>
    </>
  );
}
