import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, ChevronDown, Check, RotateCcw, AlertTriangle, FileText, Layers, Search, Edit3, Copy, X } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { rabDb } from '../../db/rabDatabase';
import { ComponentItem, AHSPComponentRef, ComponentType, AHSPItem } from '../../types/rab';
import { InputFlowHeader } from './InputFlowHeader';
import { useDiscardConfirmation } from './useDiscardConfirmation';

interface SearchableComponentSelectProps {
  value: string;
  onChange: (componentId: string) => void;
  options: ComponentItem[];
  isDark: boolean;
  placeholder?: string;
}

const DRAFT_STORAGE_KEY = 'rab_input_ahsp_draft_v1';

interface AhspFormDraft {
  name: string;
  categoryId: string;
  unit: string;
  code: string;
  reference: string;
  year: number;
  notes: string;
  componentRefs: AHSPComponentRef[];
  editingAhspId?: string | null;
}

const loadAhspDraft = (): AhspFormDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load AHSP draft:', e);
  }
  return null;
};

const SearchableComponentSelect: React.FC<SearchableComponentSelectProps> = ({
  value,
  onChange,
  options,
  isDark,
  placeholder = 'Ketik untuk mencari komponen...'
}) => {
  const selectedComp = useMemo(() => options.find(c => c.id === value), [options, value]);
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check orientation when opening
  const handleOpen = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 200 || (spaceBelow < spaceAbove && spaceBelow < 260)) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
    setIsOpen(true);
  };

  // Sync display text when value changes
  useEffect(() => {
    if (!isTyping) {
      setSearchTerm(selectedComp ? selectedComp.name : '');
    }
  }, [selectedComp, isTyping]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchTerm(selectedComp ? selectedComp.name : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedComp]);

  // Filter options based on user input
  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchTerm.trim()) return options;
    const q = searchTerm.trim().toLowerCase();
    return options.filter(o => 
      o.name.toLowerCase().includes(q) || 
      (o.specification && o.specification.toLowerCase().includes(q)) ||
      o.unit.toLowerCase().includes(q)
    );
  }, [options, searchTerm, isTyping]);

  const handleSelect = (comp: ComponentItem) => {
    onChange(comp.id);
    setSearchTerm(comp.name);
    setIsTyping(false);
    setIsOpen(false);
  };

  return (
    <div className="relative flex-1" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsTyping(true);
            handleOpen();
          }}
          onFocus={() => {
            handleOpen();
          }}
          placeholder={placeholder}
          className={`w-full h-9 pl-3 pr-8 text-xs rounded-lg border focus:outline-none truncate font-medium ${
            isDark 
              ? 'bg-[#222222] border-[#333333] text-white focus:border-blue-500' 
              : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpen();
            }
          }}
          className="absolute right-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen && (
        <div 
          className={`absolute left-0 right-0 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          } max-h-48 overflow-y-auto rounded-lg border shadow-xl z-50 py-1.5 text-xs ${
            isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected 
                      ? isDark 
                        ? 'bg-blue-600 text-white font-semibold' 
                        : 'bg-blue-50 text-blue-900 font-semibold'
                      : isDark
                        ? 'hover:bg-white/10 text-slate-200'
                        : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  <span className={`text-[10px] font-mono shrink-0 ml-1.5 px-1 rounded ${
                    isSelected 
                      ? 'opacity-80' 
                      : isDark ? 'text-slate-400 bg-white/5' : 'text-slate-500 bg-slate-100'
                  }`}>
                    {opt.unit}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-center text-slate-400 text-[11px] italic">
              Tidak ada komponen yang cocok
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const InputAhspTab: React.FC = () => {
  const { requestDiscard, discardDialog } = useDiscardConfirmation();
  const {
    categories,
    regions,
    units,
    selectedRegionId,
    selectedYear,
    saveAHSP,
    editingAhsp,
    setEditingAhsp,
    settings,
    showToast,
    lastSync,
    deleteAHSP
  } = useRabApp();

  const isDark = settings.theme === 'dark';

  const initialDraft = useMemo(() => loadAhspDraft(), []);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(() => initialDraft?.editingAhspId || null);
  const [copiedReference, setCopiedReference] = useState('');
  const submitLock = useRef(false);
  const isEditing = Boolean(editingAhsp || editingTargetId);

  const [name, setName] = useState(() => initialDraft?.name || '');
  const [categoryId, setCategoryId] = useState(() => initialDraft?.categoryId || 'cat_arsitektural');
  const [unit, setUnit] = useState(() => initialDraft?.unit || '');
  const [code, setCode] = useState(() => initialDraft?.code || rabDb.getNextAhspCode(initialDraft?.categoryId || 'cat_arsitektural'));
  const [reference, setReference] = useState(() => initialDraft?.reference || '');
  const [year, setYear] = useState(() => initialDraft?.year || 2026);
  const [notes, setNotes] = useState(() => initialDraft?.notes || '');

  // Profit & Overhead is a system calculation from global Settings, not MRV data.
  const effectiveOverheadPct = useMemo(() => {
    return settings.defaultOverheadPct ?? 10;
  }, [settings.defaultOverheadPct]);

  // Handle changing category: auto-generate code based on category prefix (A.1, S.1, E.1, M.1, L.1)
  const handleCategoryChange = (newCatId: string) => {
    if (isEditing) return;
    setCategoryId(newCatId);
    setCode(rabDb.getNextAhspCode(newCatId));
  };

  // Component lines: { component_id, coefficient, component_type }
  const [componentRefs, setComponentRefs] = useState<AHSPComponentRef[]>(() => initialDraft?.componentRefs || []);

  const allComponents = useMemo(() => rabDb.getComponents(), [lastSync]);
  const allAhsps = useMemo(() => rabDb.getAHSPEntries(), [lastSync]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'form'>(() => (initialDraft ? 'form' : 'list'));
  const [ahspSearchQuery, setAhspSearchQuery] = useState('');
  const [submittedAhspSearchQuery, setSubmittedAhspSearchQuery] = useState('');
  const [referenceAhspSearchQuery, setReferenceAhspSearchQuery] = useState('');

  const hasContent = useMemo(() => {
    return name.trim() !== '' || reference.trim() !== '' || notes.trim() !== '' || componentRefs.length > 0;
  }, [name, reference, notes, componentRefs]);

  // Save in-progress draft to localStorage so it is never lost when navigating away
  useEffect(() => {
    if (hasContent) {
      try {
        const draft: AhspFormDraft = {
          name,
          categoryId,
          unit,
          code,
          reference,
          year,
          notes,
          componentRefs,
          editingAhspId: editingAhsp?.id || editingTargetId || null
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch (e) {
        console.error('Failed to save AHSP draft:', e);
      }
    } else {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
    }
  }, [hasContent, name, categoryId, unit, code, reference, year, notes, componentRefs, editingAhsp, editingTargetId]);

  // Sync if editing or duplicating an AHSP
  useEffect(() => {
    if (editingAhsp) {
      setEditingTargetId(editingAhsp.id);
      setViewMode('form');
      setName(editingAhsp.name);
      setCategoryId(editingAhsp.category_id);
      setUnit(editingAhsp.unit);
      setCode(editingAhsp.code || rabDb.getNextAhspCode(editingAhsp.category_id));
      setReference(editingAhsp.reference || '');
      setYear(editingAhsp.year || 2026);
      setNotes(editingAhsp.notes || '');
      setComponentRefs([...editingAhsp.components]);
    }
  }, [editingAhsp]);

  const filteredAhsps = useMemo(() => {
    const q = submittedAhspSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const source = allAhsps.filter((ahsp) => {
      return [
        ahsp.name,
        ahsp.code,
        ahsp.reference,
        categories.find((category) => category.id === ahsp.category_id)?.name || ''
      ].some((value) => (value || '').toLowerCase().includes(q));
    });
    return source.slice(0, 80);
  }, [submittedAhspSearchQuery, allAhsps, categories]);

  const referenceAhspResults = useMemo(() => {
    const q = referenceAhspSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return allAhsps
      .filter((ahsp) => {
        if (editingAhsp?.id === ahsp.id) return false;
        return [
          ahsp.name,
          ahsp.code,
          ahsp.reference,
          categories.find((category) => category.id === ahsp.category_id)?.name || ''
        ].some((value) => (value || '').toLowerCase().includes(q));
      })
      .slice(0, 12);
  }, [referenceAhspSearchQuery, allAhsps, categories, editingAhsp]);

  const fillFormFromAhsp = (ahsp: AHSPItem, mode: 'edit' | 'duplicate') => {
    setEditingTargetId(mode === 'edit' ? ahsp.id : null);
    setCopiedReference(mode === 'duplicate' ? ahsp.name : '');
    setName(mode === 'duplicate' ? `${ahsp.name} (Salinan)` : ahsp.name);
    setCategoryId(ahsp.category_id);
    setUnit(ahsp.unit);
    setCode(mode === 'duplicate' ? rabDb.getNextAhspCode(ahsp.category_id) : ahsp.code || rabDb.getNextAhspCode(ahsp.category_id));
    setReference(ahsp.reference || '');
    setYear(ahsp.year || selectedYear || 2026);
    setNotes(ahsp.notes || '');
    setComponentRefs(ahsp.components.map((component) => ({ ...component })));
    setEditingAhsp(mode === 'edit' ? ahsp : null);
    setViewMode('form');
  };

  const handleCreateNew = () => {
    executeFormReset();
    setViewMode('form');
  };

  const handleEditAhsp = (ahsp: AHSPItem) => {
    fillFormFromAhsp(ahsp, 'edit');
  };

  const handleDuplicateAhsp = (ahsp: AHSPItem, confirmed = false) => {
    if (viewMode === 'form' && hasContent && !confirmed) { requestDiscard(() => handleDuplicateAhsp(ahsp, true)); return; }
    fillFormFromAhsp(ahsp, 'duplicate');
    setReferenceAhspSearchQuery('');
    showToast(`Referensi "${ahsp.name}" dimuat sebagai AHSP baru`, 'info');
  };

  const handleDeleteAhsp = (ahsp: AHSPItem) => {
    const deleted = deleteAHSP(ahsp.id);
    if (!deleted) {
      showToast('Hapus AHSP production dinonaktifkan. Gunakan MRV/API khusus jika data benar-benar perlu dihapus.', 'warning');
    }
  };

  const handleAddComponent = (type: ComponentType = 'bahan') => {
    setComponentRefs(prev => [
      ...prev,
      {
        component_id: '',
        coefficient: 0,
        component_type: type
      }
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    setComponentRefs(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateComponent = (index: number, updates: Partial<AHSPComponentRef>) => {
    setComponentRefs(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const executeFormReset = () => {
    setEditingTargetId(null);
    setCopiedReference('');
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}
    setEditingAhsp(null);
    setName('');
    setCategoryId('cat_arsitektural');
    setCode(rabDb.getNextAhspCode('cat_arsitektural'));
    setUnit('');
    setReference('');
    setNotes('');
    setComponentRefs([]);
    setReferenceAhspSearchQuery('');
    setShowResetConfirm(false);
  };

  const handleCancelForm = (confirmed = false) => {
    if (submitLock.current) return;
    if (hasContent && !confirmed) { requestDiscard(() => handleCancelForm(true)); return; }
    executeFormReset();
    setViewMode('list');
    setAhspSearchQuery('');
    setSubmittedAhspSearchQuery('');
  };

  const handleRequestResetForm = () => {
    if (hasContent || editingAhsp) {
      setShowResetConfirm(true);
    } else {
      executeFormReset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;
    const targetId = editingAhsp?.id || editingTargetId || undefined;
    if (isEditing && !rabDb.getAHSPEntries().some(item => item.id === targetId && item.code === code)) {
      showToast('Data asal edit belum tersedia atau kodenya berubah. Refresh lalu pilih ulang AHSP melalui pencarian.', 'error');
      return;
    }
    if (!isEditing && rabDb.getAHSPEntries().some(item => item.code === code.trim())) {
      showToast('Kode AHSP sudah digunakan. Pilih kategori kembali untuk mendapatkan kode baru.', 'error');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Nama pekerjaan wajib diisi', 'error');
      return;
    }
    if (!unit.trim()) {
      showToast('Satuan wajib diisi', 'error');
      return;
    }
    const validRefs = componentRefs.filter(r => r.component_id && r.component_id.trim() !== '');
    if (validRefs.length !== componentRefs.length) {
      showToast('Lengkapi komponen yang belum dipilih atau hapus baris kosongnya.', 'error');
      return;
    }
    if (validRefs.length === 0) {
      showToast('Tambahkan dan pilih minimal satu komponen analisa', 'error');
      return;
    }
    const duplicateKey = new Set<string>();
    for (const ref of validRefs) {
      const component = rabDb.getComponentById(ref.component_id);
      if (!component || !Number.isFinite(ref.coefficient) || ref.coefficient <= 0) {
        showToast('Pilih komponen valid dan isi koefisien lebih dari nol pada setiap baris.', 'error');
        return;
      }
      const key = `${ref.component_type}|${component.componentCode || ref.component_id}`;
      if (duplicateKey.has(key)) {
        showToast('Komponen AHSP duplikat. Hapus salah satu komponen yang sama sebelum menyimpan.', 'error');
        return;
      }
      duplicateKey.add(key);
    }

    try {
      submitLock.current = true;
      setIsSubmitting(true);
      await saveAHSP({
        name: trimmedName,
        category_id: categoryId,
        unit: unit.trim(),
        code: code.trim(),
        reference: reference.trim(),
        year,
        overhead_profit_pct: effectiveOverheadPct,
        components: validRefs,
        notes: notes.trim()
      }, targetId);

      executeFormReset();
      setViewMode('list');
      setAhspSearchQuery(trimmedName);
      setSubmittedAhspSearchQuery(trimmedName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan AHSP';
      showToast(msg, 'error');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#181818] text-[#E4E4E4]' : 'bg-white text-slate-800'}`}>
      {viewMode === 'list' ? (
        <>
          <div className={`p-3.5 border-b shrink-0 space-y-3 ${isDark ? 'bg-[#202020] border-white/10' : 'bg-[#F1F5F9] border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Cari Data AHSP
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {allAhsps.length} Data
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Cari Data AHSP
              </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmittedAhspSearchQuery(ahspSearchQuery.trim());
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={ahspSearchQuery}
                onChange={(e) => setAhspSearchQuery(e.target.value)}
                placeholder="Cari nama pekerjaan, kode AHSP, kategori, atau referensi..."
                className={`w-full h-9 pl-3 pr-16 text-xs border rounded-lg focus:outline-none shadow-2xs transition-colors ${
                  isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400'
                }`}
              />
              {ahspSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setAhspSearchQuery('');
                    setSubmittedAhspSearchQuery('');
                  }}
                  className="absolute right-8 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  title="Bersihkan pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 p-1 rounded text-slate-500 hover:text-blue-600 cursor-pointer"
                title="Cari"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>
            </div>

            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Baru</span>
            </button>
          </div>

          <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold shrink-0 ${
            isDark ? 'bg-[#181818] border-white/10 text-slate-400 font-mono' : 'bg-white border-slate-200 text-slate-700 font-mono'
          }`}>
            <span className="tracking-wide uppercase text-[11px]">HASIL PENCARIAN</span>
            <span className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
              isDark ? 'bg-[#222222] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              {submittedAhspSearchQuery.trim() ? `${filteredAhsps.length} Hasil` : '0 Hasil'}
            </span>
          </div>

          <div className={`flex-1 overflow-y-auto p-2 space-y-2 ${isDark ? 'bg-[#181818]' : 'bg-slate-50/60'}`}>
          {!submittedAhspSearchQuery.trim() ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                <Search className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Belum Ada Pencarian
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Ketik nama pekerjaan, kode AHSP, kategori, atau referensi, lalu tekan Enter untuk menampilkan data AHSP.
              </p>
            </div>
          ) : filteredAhsps.length === 0 ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                <Search className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Tidak Ada AHSP yang Cocok
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Ubah kata kunci pencarian, atau klik Buat Baru untuk menambahkan AHSP.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAhsps.map((ahsp) => {
                const category = categories.find((item) => item.id === ahsp.category_id);
                return (
                  <div
                    key={ahsp.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      isDark ? 'bg-[#1A1A1A] border-white/10 hover:border-blue-500/40' : 'bg-white border-slate-200 shadow-2xs hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                            {category?.name || 'AHSP'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                            Kode: {ahsp.code || '-'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                            Sat: {ahsp.unit || '-'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {ahsp.name}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{ahsp.reference || 'Referensi belum diisi'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditAhsp(ahsp)}
                          className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateAhsp(ahsp)}
                          className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Buat dari Referensi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAhsp(ahsp)}
                          className="h-7 px-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </>
      ) : (
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-3.5">
        <InputFlowHeader title={isEditing ? 'Edit AHSP' : 'Buat AHSP Baru'} editing={isEditing} reference={copiedReference}
          description={isEditing ? `Perbarui pekerjaan ${code}. Kode pekerjaan tetap; periksa komponen dan koefisien sebelum menyimpan.` : 'Buat pekerjaan dengan kode baru. Referensi opsional menyalin isian untuk diperiksa kembali sebelum disimpan.'} />
        {!isEditing && (
          <section className={`rounded-xl border p-3.5 space-y-3 ${
            isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Referensi Data
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Opsional</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Cari AHSP yang sudah ada untuk menduplikasi kategori, satuan, referensi, dan rincian komponen. Jika tidak dipakai, form tetap kosong sebagai AHSP baru.
            </p>
            <div className="relative flex items-center">
              <input
                type="text"
                value={referenceAhspSearchQuery}
                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                onChange={(e) => setReferenceAhspSearchQuery(e.target.value)}
                placeholder="Cari referensi AHSP dari data yang sudah ada..."
                style={{ paddingLeft: '2.75rem' }}
                className={`w-full h-9 pl-11 pr-8 text-xs rounded-lg border focus:outline-none ${
                  isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 placeholder:text-slate-400'
                }`}
              />
              <Search className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
              {referenceAhspSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReferenceAhspSearchQuery('')}
                  className="absolute right-2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {referenceAhspResults.length > 0 && (
              <div className="space-y-1">
                {referenceAhspResults.map((ahsp) => {
                  const category = categories.find((item) => item.id === ahsp.category_id);
                  return (
                    <button
                      key={ahsp.id}
                      type="button"
                      onClick={() => handleDuplicateAhsp(ahsp)}
                      className={`w-full rounded-lg border p-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        isDark ? 'bg-[#161616] border-white/10 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold truncate text-slate-800 dark:text-slate-100">
                          [{ahsp.code || '-'}] {ahsp.name}
                        </span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {category?.name || 'AHSP'} · Sat: {ahsp.unit || '-'} · Ref: {ahsp.reference || '-'}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold text-blue-600 dark:text-blue-400">Gunakan</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section className={`rounded-xl border p-3.5 space-y-3.5 ${
          isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                Identitas AHSP
              </span>
            </div>
            {hasContent && !editingAhsp && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                Draft Tersimpan
              </span>
            )}
          </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1.5">
            Nama Pekerjaan *
          </label>
          <div className="relative flex items-center">
            <FileText className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama uraian pekerjaan AHSP..."
              style={{ paddingLeft: '2.75rem' }}
              className={`w-full h-9 px-3 text-xs rounded-lg border focus:outline-none ${
                isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-1 focus:ring-blue-600'
              }`}
            />
          </div>
        </div>

        {/* Kategori, Satuan, Kode */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">
              Kategori
            </label>
            <select
              value={categoryId}
              disabled={isEditing}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full h-9 px-3 text-xs rounded-lg border focus:outline-none ${
                isDark ? 'bg-[#1A1A1A] border-[#333333] text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">
              Satuan *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={`w-full h-9 px-3 text-xs rounded-lg border font-mono focus:outline-none ${
                isDark ? 'bg-[#1A1A1A] border-[#333333] text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="" disabled>Pilih satuan...</option>
              {unit && !units.some(u => u.name === unit) && <option value={unit}>{unit}</option>}
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">
              Kode AHSP (Otomatis)
            </label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              value={code}
              placeholder={`${rabDb.getCategoryCodePrefix(categoryId)}.1`}
              className={`w-full h-9 px-3 text-xs rounded-lg border font-mono font-bold cursor-not-allowed select-none focus:outline-none ${
                isDark ? 'bg-[#262626] border-[#3a3a3a] text-white' : 'bg-slate-200/80 border-slate-300 text-black'
              }`}
            />
          </div>
        </div>

        {/* Referensi */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1.5">
            Referensi
          </label>
          <div className="relative flex items-center">
            <FileText className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Masukkan dasar acuan analisa..."
              style={{ paddingLeft: '2.75rem' }}
              className={`w-full h-9 px-3 text-xs rounded-lg border focus:outline-none ${
                isDark ? 'bg-[#1A1A1A] border-[#333333] text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>
        </div>
        </section>

        {/* KOMPONEN INPUT SECTION */}
        <section className={`rounded-xl border p-3.5 space-y-3.5 ${
          isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
            <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              RINCIAN KOMPONEN AHSP
            </span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Total: {componentRefs.length} komponen
            </span>
          </div>

          {/* 3 Numbered Sections: 1. Tenaga Kerja / Jasa, 2. Bahan, 3. Alat */}
          <div className="space-y-3">
            {[
              { type: 'tenaga' as ComponentType, title: '1. Tenaga Kerja / Jasa', buttonClass: 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600' },
              { type: 'bahan' as ComponentType, title: '2. Bahan', buttonClass: 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600' },
              { type: 'alat' as ComponentType, title: '3. Alat', buttonClass: 'bg-zinc-700 hover:bg-zinc-600 border border-zinc-600' }
            ].map((section) => {
              const items = componentRefs
                .map((ref, originalIndex) => ({ ref, originalIndex }))
                .filter(item => {
                  const compObj = allComponents.find(c => c.id === item.ref.component_id);
                  return (item.ref.component_type || compObj?.type) === section.type;
                });
              const typeComponents = allComponents.filter(c => c.type === section.type);
              const selectOptions = typeComponents.length > 0 ? typeComponents : allComponents;

              return (
                <div
                  key={section.type}
                  className={`rounded-xl border overflow-visible ${
                    isDark ? 'bg-[#151515] border-white/10' : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  {/* Section Header with Title and Tambah Komponen button */}
                  <div className={`px-3 py-2 flex items-center justify-between rounded-t-xl border-b ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-200">
                        {section.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        {items.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddComponent(section.type)}
                      className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center shadow-2xs transition-colors"
                      title={`Tambah Komponen ${section.title}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Component Rows for this section */}
                  <div className="p-2.5 space-y-2">
                    {items.length > 0 ? (
                      items.map(({ ref, originalIndex }) => {
                        const compObj = allComponents.find(c => c.id === ref.component_id);
                        return (
                          <div
                            key={originalIndex}
                            className={`p-2 rounded-lg border flex items-center gap-2 ${
                              isDark ? 'bg-[#161616] border-white/5' : 'bg-white border-slate-200 shadow-2xs'
                            }`}
                          >
                            {/* Component Picker: Searchable / Manual input search */}
                            <SearchableComponentSelect
                              value={ref.component_id}
                              onChange={(newId) => {
                                const newComp = allComponents.find(c => c.id === newId);
                                handleUpdateComponent(originalIndex, {
                                  component_id: newId,
                                  component_type: newComp ? newComp.type : section.type
                                });
                              }}
                              options={selectOptions}
                              isDark={isDark}
                              placeholder="Ketik untuk mencari komponen..."
                            />

                            {/* Satuan Label */}
                            <span className="text-[10px] text-slate-400 shrink-0 w-9 text-center">
                              {compObj?.unit || '-'}
                            </span>

                            {/* Koefisien Input */}
                            <div className="w-20 shrink-0">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={ref.coefficient}
                                onChange={(e) => handleUpdateComponent(originalIndex, { coefficient: parseFloat(e.target.value) || 0 })}
                                placeholder="Koef"
                                className={`w-full h-8 px-2 text-xs rounded-lg border text-right font-mono focus:outline-none ${
                                  isDark ? 'bg-[#222222] border-[#333333] text-white' : 'bg-white border-slate-300 text-slate-800'
                                }`}
                              />
                            </div>

                            {/* Delete row */}
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(originalIndex)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer transition-colors"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-[11px] border border-dashed rounded-lg dark:border-white/10">
                        Belum ada komponen {section.title.replace(/^\d+\.\s*/, '').toLowerCase()}. Klik tombol + untuk menambahkan.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Save / Update Button */}
        <div className="sticky bottom-0 bg-white dark:bg-[#181818] border-t border-slate-200 dark:border-white/10 pt-3 pb-1 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`h-9 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isSubmitting 
                ? (isEditing ? 'MEMPERBARUI...' : 'MENYIMPAN...')
                : (isEditing ? 'PERBARUI AHSP' : 'SIMPAN AHSP BARU')
              }
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleCancelForm()}
            disabled={isSubmitting}
            className="h-9 px-4 rounded-lg border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Batal
          </button>
        </div>
        </fieldset>
      </form>
      )}
      {discardDialog}

      {/* CONFIRMATION MODAL BEFORE RESETTING FORM */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className={`w-full max-w-sm rounded-lg border p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-100 ${
            isDark ? 'bg-[#202020] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-800'
          }`}>
            <div className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-full shrink-0 ${
                isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight uppercase font-mono text-slate-900 dark:text-white">
                  Reset Input AHSP?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                  Data analisis yang sedang dikerjakan akan dikosongkan. Apakah Anda yakin ingin membuang draft ini?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeFormReset}
                className="px-3.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                Reset / Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

