import React, { useMemo } from 'react';
import { X, Globe, Check, AlertCircle } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { formatRupiah } from '../../utils/currency';
import { rabDb } from '../../db/rabDatabase';

function displayUnit(unit?: string): string {
  return unit?.trim() || 'satuan';
}

export const CompareRegionsModal: React.FC = () => {
  const {
    comparisonAhspId,
    setComparisonAhspId,
    selectedRegionId,
    setSelectedRegionId,
    selectedYear,
    compareRegions,
    settings,
    showToast
  } = useRabApp();

  const isDark = settings.theme === 'dark';

  const ahsp = useMemo(() => {
    if (!comparisonAhspId) return null;
    return rabDb.getAHSPById(comparisonAhspId) || null;
  }, [comparisonAhspId]);

  const comparisons = useMemo(() => {
    if (!comparisonAhspId) return [];
    return compareRegions(comparisonAhspId);
  }, [comparisonAhspId, compareRegions]);

  if (!comparisonAhspId || !ahsp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none">
      <div 
        className={`w-full max-w-[460px] max-h-[88vh] rounded-lg shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'dark bg-[#181818] border-white/10 text-[#E4E4E4]' : 'bg-white border-slate-300 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`px-3 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#222222] border-white/10 text-white' : 'bg-[#0F172A] text-white'
        }`}>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wide">
              Perbandingan Harga Antar Daerah
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setComparisonAhspId(null)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3 flex-1 overflow-y-auto text-xs">
          {/* AHSP title */}
          <div className={`p-2.5 rounded border ${
            isDark ? 'bg-[#202020] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="font-bold text-xs">{ahsp.name}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Satuan: <span className="font-semibold text-slate-700 dark:text-slate-300">{displayUnit(ahsp.unit)}</span> • Tahun Referensi: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedYear}</span>
            </div>
          </div>

          {/* Regional Table */}
          <div className="border border-slate-200 dark:border-white/10 rounded overflow-hidden">
            <div className={`px-2.5 py-1.5 border-b text-[10px] font-bold font-mono uppercase flex justify-between ${
              isDark ? 'bg-[#222222] text-slate-400 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span>DAERAH</span>
              <span>HARGA SATUAN / {displayUnit(ahsp.unit)}</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {comparisons.map((item) => {
                const isSelected = item.region.id === selectedRegionId;
                return (
                  <div
                    key={item.region.id}
                    className={`px-3 py-2 flex items-center justify-between transition-colors ${
                      isSelected
                        ? (isDark ? 'bg-blue-900/20 text-blue-300 font-semibold' : 'bg-blue-50 text-blue-800 font-semibold')
                        : (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{item.region.name}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1 rounded bg-blue-500 text-white font-mono">
                            Aktif
                          </span>
                        )}
                      </div>
                      {item.primaryReference && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {item.primaryReference}
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono">
                      {item.hasData ? (
                        <div>
                          <div className={`font-bold text-xs ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {formatRupiah(item.totalHargaSatuan)}
                          </div>
                          {!item.isComplete && (
                            <span className="text-[9px] text-amber-500 flex items-center justify-end gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Sebagian harga</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Belum ada data
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-2.5 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-[11px] text-slate-500">
            Total 8 Daerah Acuan
          </div>
          <button
            type="button"
            onClick={() => setComparisonAhspId(null)}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
