import React, { useState, useEffect } from 'react';
import { X, Settings, Sun, Moon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';

export const RabSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settings,
    updateSettings,
    regions
  } = useRabApp();

  const [defaultRegionId, setDefaultRegionId] = useState(settings.defaultRegionId);
  const [defaultOverheadPct, setDefaultOverheadPct] = useState<number | string>(settings.defaultOverheadPct);
  const [theme, setTheme] = useState(settings.theme);

  // Confirmation states
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isSettingsModalOpen) {
      setDefaultRegionId(settings.defaultRegionId);
      setDefaultOverheadPct(settings.defaultOverheadPct);
      setTheme(settings.theme);
      setConfirmCloseOpen(false);
      setConfirmSaveOpen(false);
    }
  }, [isSettingsModalOpen, settings]);

  if (!isSettingsModalOpen) return null;

  const isDark = theme === 'dark';

  const getParsedOverhead = () => {
    return typeof defaultOverheadPct === 'string'
      ? (defaultOverheadPct.trim() === '' ? 0 : parseFloat(defaultOverheadPct) || 0)
      : (defaultOverheadPct || 0);
  };

  const checkIfHasChanges = () => {
    const currentOverhead = getParsedOverhead();
    return (
      defaultRegionId !== settings.defaultRegionId ||
      currentOverhead !== settings.defaultOverheadPct ||
      theme !== settings.theme
    );
  };

  // Close request: Check for unsaved changes
  const handleRequestClose = () => {
    if (checkIfHasChanges()) {
      setConfirmCloseOpen(true);
    } else {
      setIsSettingsModalOpen(false);
    }
  };

  // Discard changes and close
  const handleDiscardAndClose = () => {
    setDefaultRegionId(settings.defaultRegionId);
    setDefaultOverheadPct(settings.defaultOverheadPct);
    setTheme(settings.theme);
    setConfirmCloseOpen(false);
    setIsSettingsModalOpen(false);
  };

  // Save request: Open save confirmation
  const handleRequestSave = () => {
    setConfirmSaveOpen(true);
  };

  // Confirm save: Execute update
  const handleConfirmSave = () => {
    const finalOverhead = getParsedOverhead();

    updateSettings({
      defaultRegionId,
      defaultOverheadPct: Math.max(0, finalOverhead),
      theme
    });
    setConfirmSaveOpen(false);
    setConfirmCloseOpen(false);
    setIsSettingsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div 
        className={`w-full max-w-sm rounded-lg shadow-2xl border flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'dark bg-[#181818] border-white/10 text-[#E4E4E4]' : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`px-3 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#222222] border-white/10 text-white' : 'bg-[#0F172A] text-white'
        }`}>
          <div className="flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">PENGATURAN</h3>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto text-xs">
          {/* Default Region */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase mb-1">
              Daerah Acuan Default
            </label>
            <select
              value={defaultRegionId}
              onChange={(e) => setDefaultRegionId(e.target.value)}
              className={`w-full h-8 px-2.5 text-xs rounded border focus:outline-none ${
                isDark ? 'bg-[#222222] border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Overhead */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase mb-1">
              Default Overhead & Profit (%)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="0"
              value={defaultOverheadPct}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setDefaultOverheadPct('');
                } else {
                  const parsed = parseFloat(val);
                  setDefaultOverheadPct(isNaN(parsed) ? '' : Math.max(0, parsed));
                }
              }}
              className={`w-full h-8 px-2.5 text-xs rounded border font-mono focus:outline-none ${
                isDark ? 'bg-[#222222] border-white/10 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>

          {/* Tentang Aplikasi */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/10">
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase mb-1">
              Tentang Aplikasi
            </label>
            <div className={`p-2.5 rounded border text-[11px] font-mono leading-relaxed ${
              isDark ? 'bg-[#151515] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="font-bold text-slate-800 dark:text-white">RAB VIEWER v0.1.0</div>
              <p className="text-[10px] mt-0.5 opacity-80">
                Aplikasi Desktop Compact Utility Database Harga Satuan & Analisa AHSP Konstruksi.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 font-mono uppercase mb-1">
              Tema Tampilan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`h-8 rounded border flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold transition-colors ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Terang (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`h-8 rounded border flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Gelap (Dark)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-2.5 border-t flex items-center justify-end gap-2 shrink-0 ${
          isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleRequestSave}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            Simpan
          </button>
        </div>

        {/* 1. DIALOG KONFIRMASI KELUAR (JIKA ADA PERUBAHAN BELUM DISIMPAN) */}
        {confirmCloseOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className={`w-full rounded-lg border p-3.5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-100 ${
              isDark ? 'bg-[#202020] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800 shadow-xl'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-full shrink-0 ${
                  isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight uppercase font-mono text-slate-900 dark:text-white">
                    Simpan Perubahan?
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                    Terdapat perubahan pengaturan yang belum disimpan. Apakah Anda ingin menyimpan perubahan sebelum menutup?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setConfirmCloseOpen(false)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndClose}
                  className="px-2.5 py-1 rounded border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Tidak Simpan
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. DIALOG KONFIRMASI SIMPAN */}
        {confirmSaveOpen && (
          <div className="absolute inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className={`w-full rounded-lg border p-3.5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-100 ${
              isDark ? 'bg-[#202020] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800 shadow-xl'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-1.5 rounded-full shrink-0 ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight uppercase font-mono text-slate-900 dark:text-white">
                    Konfirmasi Simpan
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                    Simpan perubahan pengaturan ini ke database aplikasi?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setConfirmSaveOpen(false)}
                  className="px-3 py-1 rounded border border-slate-300 dark:border-white/15 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Tidak / Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-3.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Ya, Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
