import React from 'react';
import { FileText, Plus, Edit3 } from 'lucide-react';

export function InputFlowHeader({ title, description, editing = false, reference }: {
  title: string;
  description: string;
  editing?: boolean;
  reference?: string;
}) {
  const Icon = editing ? Edit3 : Plus;
  return (
    <section aria-label="Mode input" className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 space-y-2 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <Icon className="w-4 h-4 shrink-0" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto rounded-full bg-white px-2 py-1 text-[11px] dark:bg-white/10">{editing ? 'Edit data' : 'Data baru'}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
      {reference && <p className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"><FileText className="w-3.5 h-3.5 shrink-0" />Referensi salinan: {reference}</p>}
    </section>
  );
}
