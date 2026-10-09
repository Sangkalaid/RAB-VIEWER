import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  MapPin, 
  RotateCcw, 
  ChevronDown, 
  Search, 
  FileSpreadsheet, 
  Check, 
  TrendingUp, 
  Percent, 
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { rabDb } from '../../db/rabDatabase';
import { AHSPItem } from '../../types/rab';
import { formatRupiah, parseRupiahInput } from '../../utils/currency';

interface RabLineItem {
  id: string;
  ahspId: string;
  customName?: string;
  volume: number | string;
  unit: string;
  unitPrice: number; // calculated from AHSP for selected region
  brandOverrides?: Record<string, string>;
}

interface SearchableAhspSelectProps {
  value: string;
  onChange: (ahspId: string) => void;
  options: AHSPItem[];
  isDark: boolean;
}

function displayUnit(unit?: string): string {
  return unit?.trim() || 'satuan';
}

function variantLabel(component: { brand?: string; variantName?: string; name?: string }): string {
  const brand = component.brand?.trim() || 'Non Merek';
  const variantName = component.variantName?.trim() || component.name?.trim() || '';
  if (variantName && variantName.toLowerCase() !== brand.toLowerCase()) return `${brand} · ${variantName}`;
  return brand;
}

const SearchableAhspSelect: React.FC<SearchableAhspSelectProps> = ({
  value,
  onChange,
  options,
  isDark
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedAhsp = useMemo(() => {
    return options.find((a) => a.id === value);
  }, [options, value]);

  // Determine if dropdown should open upwards or downwards
  const handleToggleOpen = () => {
    if (!isOpen) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 250;
        // Open upwards if space below is less than estimated dropdown height, or if in lower half
        if (spaceBelow < dropdownHeight || (spaceBelow < spaceAbove && spaceBelow < 300)) {
          setOpenUpwards(true);
        } else {
          setOpenUpwards(false);
        }
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const ranked = rabDb.searchAHSPItems(searchTerm);
    const allowed = new Set(options.map((item) => item.id));
    return ranked.filter((item) => allowed.has(item.id));
  }, [options, searchTerm]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* TRIGGER BUTTON / DISPLAY BOX WITH TEXT WRAP */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`w-full h-9 py-1.5 px-3 text-xs font-medium rounded-lg border cursor-pointer text-left transition-colors flex items-center justify-between gap-1.5 whitespace-normal break-words leading-snug ${
          isDark
            ? 'bg-[#1F1F1F] border-white/10 text-white hover:border-white/20 focus:border-blue-500'
            : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400 focus:border-blue-600'
        }`}
      >
        <span className="flex-1 whitespace-normal break-words text-left leading-tight">
          {selectedAhsp ? (
            <span>
              <span className="font-mono font-bold text-blue-500 dark:text-blue-400 mr-1.5">
                [{selectedAhsp.code}]
              </span>
              <span>{selectedAhsp.name}</span>
            </span>
          ) : (
            <span className="text-slate-400 italic">-- Pilih AHSP --</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* DROPDOWN MENU (AUTO OPENS UPWARDS IF NEAR BOTTOM) */}
      {isOpen && (
        <div
          className={`absolute left-0 ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          } w-[280px] sm:w-[360px] max-w-[85vw] max-h-60 overflow-y-auto rounded-md border shadow-2xl z-50 p-1.5 text-xs ${
            isDark
              ? 'bg-[#1C1C1C] border-zinc-700 text-white'
              : 'bg-white border-slate-300 text-slate-800'
          }`}
        >
          {/* SEARCH INPUT */}
          <div className="relative mb-1.5">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode atau nama AHSP..."
              style={{ paddingLeft: '2rem' }}
              className={`w-full h-7 pl-7 pr-2 text-xs rounded border focus:outline-none ${
                isDark
                  ? 'bg-[#282828] border-zinc-700 text-white focus:border-blue-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            />
          </div>

          {/* LIST OF AHSP */}
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-slate-400 italic font-mono">
                Tidak ada AHSP yang cocok
              </div>
            ) : (
              filteredOptions.map((a) => {
                const isSelected = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left p-2 rounded text-xs transition-colors cursor-pointer flex flex-col gap-0.5 whitespace-normal break-words leading-tight ${
                      isSelected
                        ? isDark
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-blue-50 text-blue-900 font-medium'
                        : isDark
                        ? 'hover:bg-white/10 text-slate-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold opacity-80">
                        [{a.code}]
                      </span>
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/20 dark:bg-white/10 shrink-0">
                        {displayUnit(a.unit)}
                      </span>
                    </div>
                    <div className="whitespace-normal break-words leading-snug">
                      {a.name}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const KalkulatorRabTab: React.FC = () => {
  const { regions, settings, showToast, selectedRegionId, setSelectedRegionId, lastSync } = useRabApp();
  const isDark = settings.theme === 'dark';

  const [calcYear] = useState<number>(() => settings.defaultYear || 2026);

  // List of all AHSP entries from database
  const ahspList = useMemo(() => {
    return rabDb.getAHSPEntries();
  }, [lastSync]);

  // Initial line items (default empty, only headers shown)
  const [items, setItems] = useState<RabLineItem[]>([]);

  const calculateLinePrice = (ahspId: string, brandOverrides: Record<string, string> = {}) => {
    const calc = rabDb.calculateAHSP(ahspId, selectedRegionId, calcYear, brandOverrides);
    return {
      calc,
      unit: displayUnit(calc?.ahsp.unit),
      unitPrice: calc?.totalHargaSatuan || 0
    };
  };

  // Automatically recalculate unit prices when region or year changes
  useEffect(() => {
    setItems((prev) =>
      prev.map((item) => {
        if (!item.ahspId) return item;
        const result = calculateLinePrice(item.ahspId, item.brandOverrides || {});
        return {
          ...item,
          unitPrice: result.unitPrice,
          unit: result.unit
        };
      })
    );
  }, [selectedRegionId, calcYear]);

  // Handler: Add row
  const handleAddRow = () => {
    const newItem: RabLineItem = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ahspId: '',
      volume: 1,
      unit: displayUnit(),
      unitPrice: 0
    };

    setItems((prev) => [...prev, newItem]);
    showToast(`Baris pekerjaan #${items.length + 1} ditambahkan`, 'info');
  };

  // Handler: Delete row
  const handleDeleteRow = (id: string, index: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    showToast(`Baris #${index + 1} dihapus`, 'info');
  };

  // Handler: Change AHSP for a row
  const handleAhspChange = (rowId: string, newAhspId: string) => {
    const foundAhsp = ahspList.find((a) => a.id === newAhspId);
    if (!foundAhsp) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === rowId
            ? { ...it, ahspId: '', unitPrice: 0 }
            : it
        )
      );
      return;
    }

    const calc = rabDb.calculateAHSP(newAhspId, selectedRegionId, calcYear);
    const newPrice = calc ? calc.totalHargaSatuan : 0;

    setItems((prev) =>
      prev.map((it) =>
        it.id === rowId
          ? {
              ...it,
              ahspId: newAhspId,
              unit: displayUnit(foundAhsp.unit),
              unitPrice: newPrice,
              brandOverrides: {}
            }
          : it
      )
    );
  };

  const handleBrandOverrideChange = (rowId: string, componentId: string, selectedComponentId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId || !item.ahspId) return item;
        const brandOverrides = {
          ...(item.brandOverrides || {}),
          [componentId]: selectedComponentId
        };
        const result = calculateLinePrice(item.ahspId, brandOverrides);
        return {
          ...item,
          brandOverrides,
          unit: result.unit,
          unitPrice: result.unitPrice
        };
      })
    );
  };

  // Handler: Change volume
  const handleVolumeChange = (rowId: string, rawVal: string) => {
    const num = parseFloat(rawVal.replace(',', '.'));
    setItems((prev) =>
      prev.map((it) =>
        it.id === rowId
          ? {
              ...it,
              volume: rawVal === '' ? '' : isNaN(num) ? 0 : num
            }
          : it
      )
    );
  };

  // Calculations
  const calculations = useMemo(() => {
    let subtotalDirectCost = 0;

    const rowDetails = items.map((it) => {
      const volNum = typeof it.volume === 'number' ? it.volume : parseFloat(it.volume.toString()) || 0;
      const rowTotal = volNum * (it.unitPrice || 0);
      subtotalDirectCost += rowTotal;
      return {
        ...it,
        volNum,
        rowTotal
      };
    });

    return {
      rowDetails,
      totalCost: subtotalDirectCost
    };
  }, [items]);

  // Reset entire calculator
  const handleResetCalculator = () => {
    setItems([]);
    showToast('Kalkulator berhasil dibersihkan', 'info');
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#181818] text-[#E4E4E4]' : 'bg-white text-slate-800'}`}>
      {/* 1. FILTER & DAERAH HEADER (SERAGAM DENGAN TAB CEK HARGA) */}
      <div className={`p-3.5 border-b shrink-0 space-y-3 ${
        isDark ? 'bg-[#202020] border-white/10' : 'bg-[#F1F5F9] border-slate-200'
      }`}>
        {/* ROW 1: DAERAH DROPDOWN */}
        <div>
          <label className={`block text-[10px] font-semibold uppercase mb-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            DAERAH
          </label>
          <div className="relative">
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              className={`w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border appearance-none focus:outline-none cursor-pointer transition-colors shadow-2xs ${
                isDark 
                  ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500' 
                  : 'bg-white border-slate-300 text-slate-800 focus:ring-1 focus:ring-blue-600'
              }`}
            >
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>
      </div>

      {/* 2. DAFTAR BARIS PEKERJAAN (SCROLLABLE TABLE / LIST) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase font-mono tracking-wide">
              Uraian Pekerjaan ({items.length} Item)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetCalculator}
              className="h-7 w-7 rounded-lg border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer flex items-center justify-center shadow-2xs transition-colors"
              title="Reset semua baris"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleAddRow}
              className="h-7 w-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center shadow-2xs transition-colors"
              title="Tambah baris pekerjaan"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className={`rounded-xl border py-9 px-4 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px] italic ${
              isDark ? 'border-white/10 bg-[#161616]' : 'border-slate-200 bg-white shadow-2xs'
            }`}>
              Belum ada uraian pekerjaan. Klik ikon (+) di atas untuk menambahkan baris.
            </div>
          ) : (
            calculations.rowDetails.map((row, index) => {
              const calc = row.ahspId ? rabDb.calculateAHSP(row.ahspId, selectedRegionId, calcYear, row.brandOverrides || {}) : null;
              const brandSelectableLines = calc
                ? calc.bahanLines
                  .map((line) => ({
                    line,
                    alternatives: rabDb.getBrandAlternativesForComponent(line.component.id, selectedRegionId, calcYear)
                  }))
                  .filter((entry) => entry.alternatives.length > 0)
                : [];
              return (
                <div
                  key={row.id}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    isDark
                      ? 'bg-[#161616] border-white/10 hover:border-white/20'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="grid grid-cols-[30px_1fr_74px_24px] gap-2 items-start">
                    <div className="overflow-hidden rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-center">
                      <div className="bg-blue-600 text-white text-[7px] font-mono font-bold uppercase leading-none py-1">
                        No
                      </div>
                      <div className="h-8 flex items-center justify-center text-[11px] font-mono font-extrabold text-blue-700 dark:text-blue-300">
                        {index + 1}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[8px] font-mono font-bold uppercase text-slate-400 mb-0.5">Pilih AHSP</label>
                      <SearchableAhspSelect
                        value={row.ahspId}
                        onChange={(newAhspId) => handleAhspChange(row.id, newAhspId)}
                        options={ahspList}
                        isDark={isDark}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono font-bold uppercase text-slate-400 mb-0.5 text-center">Vol</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.volume}
                        onChange={(e) => handleVolumeChange(row.id, e.target.value)}
                        placeholder="0"
                        className={`w-full h-8 px-1.5 text-center font-mono font-bold text-xs rounded border focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isDark
                            ? 'bg-[#1F1F1F] border-white/10 text-white focus:border-blue-500'
                            : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(row.id, index)}
                      className="mt-[18px] p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {brandSelectableLines.length > 0 && (
                    <div className={`mt-2 rounded-lg border p-2 space-y-1.5 ${
                      isDark ? 'bg-[#101010] border-white/10' : 'bg-slate-50/80 border-slate-200'
                    }`}>
                      <div className="text-[9px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Pilih Merek Bahan</div>
                      {brandSelectableLines.map(({ line, alternatives }) => (
                        <div key={line.component.id} className="grid grid-cols-[1fr_130px] items-center gap-2">
                          <span className="min-w-0 truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            {line.component.name}
                          </span>
                          <select
                            value={row.brandOverrides?.[line.component.id] || alternatives[0]?.id || line.component.id}
                            onChange={(e) => handleBrandOverrideChange(row.id, line.component.id, e.target.value)}
                            className={`h-7 rounded border px-2 text-[11px] font-mono font-semibold outline-none ${
                              isDark
                                ? 'bg-[#111827] border-white/10 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {alternatives.map((component) => (
                              <option key={component.id} value={component.id}>
                                {variantLabel(component)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`mt-2 grid grid-cols-3 rounded-lg border overflow-hidden font-mono ${
                    isDark ? 'border-white/10 bg-[#101010]' : 'border-slate-200 bg-slate-50/70'
                  }`}>
                    <div className="px-2 py-1.5 border-r border-slate-200 dark:border-white/10">
                      <div className="text-[8px] uppercase font-bold text-slate-400">Sat</div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{displayUnit(row.unit)}</div>
                    </div>
                    <div className="px-2 py-1.5 border-r border-slate-200 dark:border-white/10 text-right">
                      <div className="text-[8px] uppercase font-bold text-slate-400">Harga</div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{row.unitPrice ? Math.round(row.unitPrice).toLocaleString('id-ID') : '-'}</div>
                    </div>
                    <div className="px-2 py-1.5 text-right">
                      <div className="text-[8px] uppercase font-bold text-slate-400">Jumlah</div>
                      <div className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 truncate">Rp {Math.round(row.rowTotal).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {items.length > 0 && (
            <div className={`rounded-xl border px-3 py-2 flex items-center justify-between font-mono ${
              isDark ? 'bg-[#1C1C1C] border-white/20 text-white' : 'bg-white border-slate-300 text-slate-800 shadow-2xs'
            }`}>
              <span className="text-[10px] uppercase font-bold text-slate-500">Total Nilai RAB</span>
              <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                Rp {Math.round(calculations.totalCost).toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
