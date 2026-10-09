import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, settings } = useRabApp();
  const isDark = settings.theme === 'dark';

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info' || !toast.type;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg shadow-xl border text-xs transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              isDark
                ? isSuccess
                  ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                  : isError
                    ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                    : isWarning
                      ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                      : 'bg-zinc-900/95 border-white/20 text-slate-200'
                : isSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : isError
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : isWarning
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-500" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
              {isInfo && <Info className="w-4 h-4 text-blue-500" />}
            </div>

            <div className="flex-1 min-w-0 font-medium break-words leading-tight">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              title="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
