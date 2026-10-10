import React, { useRef, useState } from 'react';

export function useDiscardConfirmation() {
  const action = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const dismiss = () => { action.current = null; setOpen(false); };
  return {
    requestDiscard: (next: () => void) => { action.current = next; setOpen(true); },
    discardDialog: open ? (
      <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" onKeyDown={e => { if (e.key === 'Escape') dismiss(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="discard-title" onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const buttons = e.currentTarget.querySelectorAll('button');
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900 space-y-4">
          <h2 id="discard-title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Buang perubahan form?</h2>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">Isian yang belum disimpan akan dibuang atau diganti. Data yang sudah tersimpan tetap tersedia.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button autoFocus type="button" onClick={dismiss} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 dark:text-slate-200">Lanjut Mengisi</button>
            <button type="button" onClick={() => { const next = action.current; dismiss(); next?.(); }} className="rounded-lg bg-rose-600 px-3 py-2 text-xs text-white">Buang Perubahan</button>
          </div>
        </section>
      </div>
    ) : null
  };
}
