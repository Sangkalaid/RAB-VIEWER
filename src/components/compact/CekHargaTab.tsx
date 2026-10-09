import React, { useRef, useEffect, useState } from 'react';
import { Search, ChevronDown, X, Plus, AlertCircle, Layers, FileText, MapPin, ArrowRight, Copy, Loader2 } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { formatRupiah } from '../../utils/currency';
import { rabDb } from '../../db/rabDatabase';

export const CekHargaTab: React.FC = () => {
  const { regions, selectedRegionId, setSelectedRegionId, selectedYear, searchQuery, setSearchQuery, submittedQuery, searchStatus, searchSuggestions, executeSearch, clearSearch, searchResults, addSearchHistory, setSelectedDetailCalc, setActiveTab, categories, settings, showToast } = useRabApp();
  const isDark = settings.theme === 'dark';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [brandOverrides, setBrandOverrides] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const handleFocusSearch = () => setTimeout(() => { searchInputRef.current?.focus(); searchInputRef.current?.select(); }, 50);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFocusSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('rab_focus_search', handleFocusSearch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('rab_focus_search', handleFocusSearch);
    };
  }, []);

  const runSearch = (value = searchQuery) => {
    setSuggestionOpen(false);
    setActiveSuggestion(-1);
    void executeSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestionOpen && searchSuggestions.length) {
      e.preventDefault();
      setActiveSuggestion((idx) => Math.min(idx + 1, searchSuggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && suggestionOpen && searchSuggestions.length) {
      e.preventDefault();
      setActiveSuggestion((idx) => Math.max(idx - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      setSuggestionOpen(false);
      setActiveSuggestion(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = activeSuggestion >= 0 ? searchSuggestions[activeSuggestion] : searchQuery;
      setSearchQuery(selected);
      runSearch(selected);
    }
  };

  const handleCopyPriceValue = async (price: number) => {
    const valueStr = Math.round(price).toString();
    try {
      await navigator.clipboard?.writeText(valueStr);
      showToast(`Nilai ${valueStr} berhasil disalin`, 'success');
    } catch {
      showToast('Gagal menyalin nilai', 'error');
    }
  };

  const countLabel = searchStatus === 'success' || searchStatus === 'empty' ? `${searchResults.length} Hasil` : '0 Hasil';
  const displayUnit = (unit?: string) => unit?.trim() || 'satuan';
  const variantLabel = (component: { brand?: string; variantName?: string; name?: string; variantId?: string }) => {
    const brand = component.brand?.trim() || 'Non Merek';
    const variantName = component.variantName?.trim() || component.name?.trim() || '';
    if (variantName && variantName.toLowerCase() !== brand.toLowerCase()) return `${brand} · ${variantName}`;
    return brand;
  };

  const handleBrandOverrideChange = (ahspId: string, componentId: string, selectedComponentId: string) => {
    setBrandOverrides((prev) => ({
      ...prev,
      [ahspId]: {
        ...(prev[ahspId] || {}),
        [componentId]: selectedComponentId
      }
    }));
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#181818] text-[#E4E4E4]' : 'bg-white text-slate-800'}`}>
      <div className={`p-3.5 border-b shrink-0 space-y-3 ${isDark ? 'bg-[#202020] border-white/10' : 'bg-[#F1F5F9] border-slate-200'}`}>
        <div>
          <label className={`block text-[10px] font-semibold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>DAERAH</label>
          <div className="relative">
            <select value={selectedRegionId} onChange={(e) => setSelectedRegionId(e.target.value)} className={`w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border appearance-none focus:outline-none cursor-pointer transition-colors shadow-2xs ${isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-800 focus:ring-1 focus:ring-blue-600'}`}>
              {regions.map((reg) => <option key={reg.id} value={reg.id}>{reg.name}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>

        <div>
          <label className={`block text-[10px] font-semibold uppercase mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CARI URAIAN PEKERJAAN</label>
          <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="relative flex items-center">
            <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSuggestionOpen(Boolean(e.target.value.trim())); setActiveSuggestion(-1); }} onFocus={() => setSuggestionOpen(Boolean(searchQuery.trim()))} onKeyDown={handleKeyDown} placeholder="Cari Pekerjaan....." className={`w-full h-9 pl-3 pr-16 text-xs border rounded-lg focus:outline-none shadow-2xs transition-colors ${isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400'}`} />
            {searchQuery && <button type="button" onClick={() => { clearSearch(); searchInputRef.current?.focus(); }} className="absolute right-8 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
            <button type="submit" disabled={searchStatus === 'searching'} className="absolute right-1.5 p-1 rounded text-slate-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer">{searchStatus === 'searching' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}</button>
            {suggestionOpen && searchSuggestions.length > 0 && (
              <div className={`absolute left-0 right-0 top-9 z-30 rounded-lg border shadow-xl overflow-hidden ${isDark ? 'bg-[#202020] border-white/10' : 'bg-white border-slate-200'}`}>
                {searchSuggestions.map((suggestion, idx) => (
                  <button key={suggestion} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSearchQuery(suggestion); runSearch(suggestion); }} className={`w-full text-left px-3 py-2 text-xs ${idx === activeSuggestion ? 'bg-blue-600 text-white' : isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>{suggestion}</button>
                ))}
              </div>
            )}
          </form>
        </div>

      </div>

      <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-semibold shrink-0 ${isDark ? 'bg-[#181818] border-white/10 text-slate-400 font-mono' : 'bg-white border-slate-200 text-slate-700 font-mono'}`}>
        <span className="tracking-wide uppercase text-[11px]">HASIL PENCARIAN</span>
        <span className={`px-2 py-0.5 rounded border text-[11px] font-mono ${isDark ? 'bg-[#222222] border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{countLabel}</span>
      </div>

      <div className={`flex-1 overflow-y-auto p-2 space-y-2 ${isDark ? 'bg-[#181818]' : 'bg-slate-50/60'}`}>
        {searchStatus === 'idle' ? <IdleState isDark={isDark} />
          : searchStatus === 'searching' ? <LoadingState query={submittedQuery} isDark={isDark} />
          : searchStatus === 'error' ? <MessageState isDark={isDark} title="Pencarian Gagal" body="Terjadi kendala saat memproses pencarian. Silakan coba lagi." />
          : searchResults.length > 0 ? searchResults.map((calc) => {
            const overrides = brandOverrides[calc.ahsp.id] || {};
            const displayCalc = rabDb.calculateAHSP(calc.ahsp.id, selectedRegionId, selectedYear, overrides) || calc;
            const brandSelectableLines = calc.bahanLines
              .map((line) => ({
                line,
                alternatives: rabDb.getBrandAlternativesForComponent(line.component.id, selectedRegionId, selectedYear)
              }))
              .filter((entry) => entry.alternatives.length > 0);

            return (
            <div key={calc.ahsp.id} className={`p-3.5 rounded-xl border transition-all ${isDark ? 'bg-[#202020] border-white/10 hover:border-white/25 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold tracking-wide uppercase font-mono"><Layers className="w-3 h-3" /><span>{categories.find(c => c.id === displayCalc.ahsp.category_id)?.name || 'Arsitektural'}</span></div>
                {displayCalc.ahsp.code && <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-mono"><span>Kode: {displayCalc.ahsp.code}</span></div>}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight mb-2.5">{displayCalc.ahsp.name}</h3>
              <div className={`px-3.5 py-2.5 rounded-xl mb-2.5 flex items-center justify-between ${isDark ? 'bg-[#151515] border border-white/5' : 'bg-slate-100/80 border border-slate-200/50'}`}>
                <div className="font-mono"><span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{formatRupiah(displayCalc.totalHargaSatuan)}</span><span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-300 ml-1.5">/ {displayUnit(displayCalc.ahsp.unit)}</span></div>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleCopyPriceValue(displayCalc.totalHargaSatuan); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"><Copy className="w-4 h-4" /></button>
              </div>
              {brandSelectableLines.length > 0 && (
                <div className={`mb-2 rounded-lg border p-2 space-y-1.5 ${isDark ? 'bg-[#181818] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Pilih Merek Bahan</div>
                  {brandSelectableLines.map(({ line, alternatives }) => (
                    <div key={line.component.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="min-w-0 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{line.component.name}</div>
                      <select
                        value={overrides[line.component.id] || alternatives[0]?.id || line.component.id}
                        onChange={(e) => handleBrandOverrideChange(calc.ahsp.id, line.component.id, e.target.value)}
                        className={`h-7 max-w-[170px] rounded border px-2 text-[11px] font-mono font-semibold outline-none ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      >
                        {alternatives.map((component) => (
                          <option key={component.id} value={component.id}>{variantLabel(component)}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              {!displayCalc.isComplete && <div className="mb-2 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{displayCalc.missingComponents.length} komponen belum memiliki harga {displayCalc.region.name}.</div>}
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0"><div className="flex items-center gap-1 truncate"><FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="font-medium text-[11px] truncate">{displayCalc.primaryReference}</span></div><span className="text-slate-300 dark:text-slate-700">|</span><div className="flex items-center gap-1 shrink-0"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="font-medium text-[11px]">{displayCalc.region.name}</span></div></div>
                <button type="button" onClick={() => { if (submittedQuery.trim()) addSearchHistory(submittedQuery); setSelectedDetailCalc(displayCalc); }} className="px-3 py-1.5 rounded-lg bg-[#0B132B] hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs shrink-0 ml-auto"><span>Lihat Detail</span><ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}) : (
            <div className={`p-8 text-center space-y-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
              <div><div className="text-xs font-bold text-slate-700 dark:text-slate-200">Tidak Ada Hasil</div><div className="text-[11px] mt-0.5 text-slate-400">Tidak ditemukan pekerjaan yang sesuai dengan "{submittedQuery}". Coba gunakan kata kunci lain atau periksa ejaan.</div></div>
              <button type="button" onClick={() => setActiveTab('input_ahsp')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"><Plus className="w-3.5 h-3.5" /><span>+ Input AHSP Baru</span></button>
            </div>
          )}
      </div>
    </div>
  );
};

const IdleState: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><Search className="w-5 h-5 opacity-75" /></div>
    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Belum Ada Pencarian</h4>
    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed">Ketik nama pekerjaan atau kode AHSP, lalu tekan Enter untuk melihat harga satuan.</p>
  </div>
);

const LoadingState: React.FC<{ query: string; isDark: boolean }> = ({ query, isDark }) => (
  <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
    <div className="relative w-16 h-16 flex items-center justify-center mb-3">
      <span className="absolute inset-0 rounded-full border border-blue-400/40 animate-ping" />
      <span className="absolute inset-2 rounded-full border border-blue-500/30 animate-pulse" />
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 text-blue-300' : 'bg-blue-50 text-blue-600'}`}><Search className="w-5 h-5" /></div>
    </div>
    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Sedang Mencari...</h4>
    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[280px] truncate">Mencari pekerjaan yang sesuai dengan "{query}"</p>
  </div>
);

const MessageState: React.FC<{ isDark: boolean; title: string; body: string }> = ({ isDark, title, body }) => (
  <div className={`p-8 text-center space-y-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
    <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
    <div><div className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</div><div className="text-[11px] mt-0.5 text-slate-400">{body}</div></div>
  </div>
);
