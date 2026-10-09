import React, { useState } from 'react';
import { X, Ruler, Plus, Trash2, Edit2, Check, AlertCircle, Search } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { rabDb } from '../../db/rabDatabase';

interface KelolaSatuanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KelolaSatuanModal: React.FC<KelolaSatuanModalProps> = ({ isOpen, onClose }) => {
  const { units, settings, showToast, refreshData } = useRabApp();
  const isDark = settings.theme === 'dark';

  const [newName, setNewName] = useState('');
  const [searchUnit, setSearchUnit] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newName.trim();
    if (!trimmed) {
      setErrorMsg('Nama simbol satuan tidak boleh kosong (cth: m², kg, OH)');
      return;
    }
    try {
      rabDb.addUnit(trimmed);
      setNewName('');
      refreshData();
      showToast(`Satuan "${trimmed}" berhasil ditambahkan`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan satuan');
    }
  };

  const handleStartEdit = (unit: { id: string; name: string; description?: string }) => {
    setEditingId(unit.id);
    setEditName(unit.name);
  };

  const handleSaveEdit = (id: string) => {
    setErrorMsg('');
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrorMsg('Nama satuan tidak boleh kosong');
      return;
    }
    try {
      rabDb.updateUnit(id, trimmed);
      setEditingId(null);
      refreshData();
      showToast(`Satuan "${trimmed}" berhasil diperbarui`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui satuan');
    }
  };

  const handleDeleteUnit = (id: string, name: string) => {
    if (units.length <= 1) {
      showToast('Minimal harus ada 1 satuan terdaftar', 'error');
      return;
    }
    if (confirm(`Yakin ingin menghapus satuan "${name}"?`)) {
      try {
        rabDb.deleteUnit(id);
        refreshData();
        showToast(`Satuan "${name}" berhasil dihapus`, 'info');
      } catch (err: any) {
        showToast(err.message || 'Gagal menghapus satuan', 'error');
      }
    }
  };

  const filteredUnits = units.filter(u => {
    if (!searchUnit.trim()) return true;
    const q = searchUnit.toLowerCase();
    return u.name.toLowerCase().includes(q);
  });

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
            <Ruler className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide font-mono">Kelola Satuan (Unit)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup (Esc)"
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

          {/* Form Tambah Satuan */}
          <div className={`p-3 rounded-lg border ${
            isDark ? 'bg-[#202020] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-500 font-mono mb-2">
              + Tambah Satuan Baru
            </div>
            <form onSubmit={handleAddUnit} className="space-y-2">
              <input
                type="text"
                placeholder="Satuan (m², kg, OH)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded border text-xs font-mono font-semibold outline-none ${
                  isDark 
                    ? 'bg-[#151515] border-white/10 text-white focus:border-blue-500 placeholder:text-slate-500' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
                }`}
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Satuan</span>
              </button>
            </form>
          </div>

          {/* Daftar Satuan Terdaftar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Daftar Satuan ({units.length})
              </span>
            </div>

            {/* Pencarian Satuan */}
            {units.length > 6 && (
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari satuan..."
                  value={searchUnit}
                  onChange={(e) => setSearchUnit(e.target.value)}
                  style={{ paddingLeft: '2rem' }}
                  className={`w-full h-7 pl-8 pr-2.5 text-xs rounded border outline-none ${
                    isDark ? 'bg-[#151515] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            )}

            <div className="space-y-1.5 max-h-[36vh] overflow-y-auto pr-0.5">
              {filteredUnits.map((u) => {
                const isEditing = editingId === u.id;

                return (
                  <div
                    key={u.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                      isDark ? 'bg-[#202020] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Simbol Satuan"
                          className={`w-20 px-2 py-1 rounded border text-xs font-mono font-bold outline-none ${
                            isDark ? 'bg-[#151515] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(u.id)}
                          className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                          title="Simpan"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded bg-slate-500 hover:bg-slate-600 text-white cursor-pointer shrink-0"
                          title="Batal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 shrink-0">
                            {u.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                            title="Edit satuan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {units.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUnit(u.id, u.name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                              title="Hapus satuan"
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
              {filteredUnits.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  Tidak ada satuan yang cocok dengan pencarian "{searchUnit}"
                </div>
              )}
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
