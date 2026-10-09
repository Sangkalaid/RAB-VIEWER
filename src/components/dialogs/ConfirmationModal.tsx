import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isDestructive = true,
  onConfirm,
  onCancel
}) => {
  const { settings } = useRabApp();
  const isDark = settings.theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
      <div 
        className={`w-full max-w-md rounded-lg shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-[#1A1A1A] border-white/15 text-[#E4E4E4]' : 'bg-white border-slate-200 text-slate-800'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#141414] border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded ${
              isDestructive 
                ? isDark ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-50 text-rose-600' 
                : isDark ? 'bg-[#FF4D00]/20 text-[#FF4D00]' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white uppercase font-heading' : 'text-slate-900'}`}>{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={`p-5 text-xs leading-relaxed ${isDark ? 'text-[#CCCCCC] font-mono' : 'text-slate-600'}`}>
          {message}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-end gap-2.5 ${
          isDark ? 'bg-[#171717] border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onCancel}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              isDark ? 'text-[#888888] hover:text-white font-mono' : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-medium text-white rounded shadow-xs transition-colors cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : isDark ? 'bg-[#FF4D00] hover:bg-[#E04400] font-bold uppercase' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
