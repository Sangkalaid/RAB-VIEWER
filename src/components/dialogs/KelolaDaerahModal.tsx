import React, { useState } from 'react';
import { X, MapPin, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { rabDb } from '../../db/rabDatabase';

interface KelolaDaerahModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KelolaDaerahModal: React.FC<KelolaDaerahModalProps> = ({ isOpen, onClose }) => {
  const { regions, settings, updateSettings, showToast, refreshData } = useRabApp();
  const isDark = settings.theme === 'dark';

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddRegion = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg('Nama daerah tidak boleh kosong');
      return;
    }
    try {
      rabDb.addRegion(trimmed);
      setNewName('');
      refreshData();
      showToast(`Daerah "${trimmed}" berhasil ditambahkan`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan daerah');
    }
  };

  const handleStartEdit = (region: { id: string; name: string }) => {
    setEditingId(region.id);
    setEditName(region.name);
  };

  const handleSaveEdit = (id: string) => {
    setErrorMsg('');
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg('Nama daerah tidak boleh kosong');
      return;
    }
    try {
      rabDb.updateRegion(id, trimmed);
      setEditingId(null);
      refreshData();
      showToast(`Daerah "${trimmed}" berhasil diperbarui`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui daerah');
    }
  };

  const handleDeleteRegion = (id: string, name: string) => {
    if (regions.length <= 1) {
      showToast('Minimal harus ada 1 daerah terdaftar', 'error');
      return;
    }
    if (confirm(`Yakin ingin menghapus daerah "${name}"?`)) {
      try {
        rabDb.deleteRegion(id);
        refreshData();
        showToast(`Daerah "${name}" berhasil dihapus`, 'info');
      } catch (err: any) {
        showToast(err.message || 'Gagal menghapus daerah', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div 
        className={`w-full max-w-md rounded-lg shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'dark bg-[#181818] border-white/10 text-[#E4E4E4]' : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`px-3 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#222222] border-white/10 text-white' : 'bg-[#0F172A] text-white'
        }`}>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">Kelola Daerah</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[11px] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Tambah Daerah */}
          <div className={`p-3 rounded-lg border ${
            isDark ? 'bg-[#202020] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 font-mono mb-2">
              + Tambah Daerah Baru
            </div>
            <form onSubmit={handleAddRegion} className="space-y-2">
              <div>
                <input
                  type="text"
                  placeholder="Nama Daerah (cth: Jawa Barat / Bandung)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded border text-xs outline-none ${
                    isDark 
                      ? 'bg-[#151515] border-white/10 text-white focus:border-blue-500 placeholder:text-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                  }`}
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Daerah</span>
              </button>
            </form>
          </div>

          {/* Daftar Daerah Terdaftar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Daftar Daerah ({regions.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Kelola daftar wilayah proyek
              </span>
            </div>

            <div className="space-y-1.5">
              {regions.map((reg) => {
                const isDefault = settings.defaultRegionId === reg.id;
                const isEditing = editingId === reg.id;

                return (
                  <div
                    key={reg.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                      isDefault 
                        ? isDark ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50/70 border-blue-200'
                        : isDark ? 'bg-[#202020] border-white/10' : 'bg-white border-slate-200'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`flex-1 px-2 py-1 rounded border text-xs outline-none ${
                            isDark ? 'bg-[#151515] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(reg.id)}
                          className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          title="Simpan"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded bg-slate-500 hover:bg-slate-600 text-white cursor-pointer"
                          title="Batal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex items-center gap-2">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDefault ? 'text-blue-500' : 'text-slate-400'}`} />
                          <div>
                            <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                              <span className={isDefault ? 'text-blue-600 dark:text-blue-400' : ''}>{reg.name}</span>
                              {isDefault && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(reg)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title="Edit nama daerah"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {regions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRegion(reg.id, reg.name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="Hapus daerah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-2.5 border-t flex justify-end shrink-0 ${
          isDark ? 'bg-[#202020] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
