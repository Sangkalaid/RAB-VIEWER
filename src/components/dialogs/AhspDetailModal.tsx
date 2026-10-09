import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Layers, 
  Pencil,
  FileText, 
  Tag, 
  Users, 
  Package, 
  Wrench, 
  Percent, 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle 
} from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { formatRupiah, formatKoefisien } from '../../utils/currency';

function formatNumberDot(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  const rounded = Math.round(val);
  return rounded.toLocaleString('id-ID');
}

function displayUnit(unit?: string): string {
  return unit?.trim() || 'satuan';
}

export const AhspDetailModal: React.FC = () => {
  const {
    selectedDetailCalc,
    setSelectedDetailCalc,
    setComparisonAhspId,
    duplicateAHSP,
    setEditingAhsp,
    setActiveTab,
    showToast,
    settings
  } = useRabApp();

  const isDark = settings.theme === 'dark';

  const [showTenaga, setShowTenaga] = useState(true);
  const [showBahan, setShowBahan] = useState(true);
  const [showAlat, setShowAlat] = useState(true);
  const [showOverhead, setShowOverhead] = useState(true);

  if (!selectedDetailCalc) return null;

  const {
    ahsp,
    region,
    year,
    tenagaLines,
    bahanLines,
    alatLines,
    totalTenaga,
    totalBahan,
    totalAlat,
    subtotalDasar,
    overheadPct,
    overheadAmount,
    totalHargaSatuan,
    isComplete,
    missingComponents,
    primarySourceType,
    primaryReference
  } = selectedDetailCalc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs select-none">
      <div 
        className={`w-full max-w-[540px] h-[700px] max-h-[96vh] rounded-lg shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'dark bg-[#181818] border-white/10 text-[#E4E4E4]' : 'bg-white border-slate-300 text-slate-800'
        }`}
        style={{ minWidth: '340px' }}
      >
        {/* 1. MODAL HEADER */}
        <div className={`h-8 select-none flex items-center justify-between px-2.5 text-xs shrink-0 relative transition-colors duration-150 ${
          isDark 
            ? 'bg-[#121212] text-slate-300 border-b border-white/10' 
            : 'bg-[#0F172A] text-slate-300 border-b border-slate-800'
        }`}>
          {/* Left: Modal Identity */}
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wide text-[11px] text-white font-mono">
              DETAIL AHSP
            </span>
          </div>

          {/* Right: Close control */}
          <button
            type="button"
            onClick={() => setSelectedDetailCalc(null)}
            className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. SCROLLABLE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* TOP CARD: Title, Stats & Price */}
          <div className={`p-3 rounded-lg border ${
            isDark ? 'bg-[#202020] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            {/* Row 1: Title */}
            <div>
              <h2 className="text-xs sm:text-sm font-bold leading-snug text-slate-900 dark:text-white">
                {ahsp.name}
              </h2>
            </div>

            {/* COMBINED STATS & PRICE BOX WITH BORDER */}
            <div className="mt-2.5 rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              {/* Top part: Stats (Satuan, Ref. Harga, Kode) with vertical borders */}
              <div className="grid grid-cols-12 divide-x divide-slate-200 dark:divide-white/10">
                {/* Satuan */}
                <div className="col-span-3 p-2.5 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mb-0.5">Satuan</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate">{displayUnit(ahsp.unit)}</div>
                  </div>
                </div>

                {/* Ref. Harga */}
                <div className="col-span-5 p-2.5 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mb-0.5">Referensi AHSP</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate">
                      {primaryReference}
                    </div>
                  </div>
                </div>

                {/* Kode */}
                <div className="col-span-4 p-2.5 flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 shrink-0">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mb-0.5">Kode</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white leading-none font-mono truncate">
                      {ahsp.code || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom part: Price Banner with gray background and black text */}
              <div className="px-3 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-bold text-slate-600 dark:text-slate-400 tracking-wider font-mono uppercase mb-0.5">
                    HARGA SATUAN PEKERJAAN
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                      {formatRupiah(totalHargaSatuan)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 ml-1 font-mono">
                      / {displayUnit(ahsp.unit)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const valueStr = Math.round(totalHargaSatuan).toString();
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(valueStr);
                      }
                      showToast(`Nilai ${valueStr} berhasil disalin`, 'success');
                    } catch {
                      showToast('Gagal menyalin nilai', 'error');
                    }
                  }}
                  title={`Salin nilai harga (${Math.round(totalHargaSatuan)})`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Missing components notice if any */}
          {!isComplete && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Terdapat {missingComponents.length} komponen belum memiliki harga di {region.name}: {missingComponents.join(', ')}</span>
            </div>
          )}

          {/* SECTION A: TENAGA KERJA */}
          <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-2xs">
            <div 
              onClick={() => setShowTenaga(!showTenaga)}
              className="bg-black text-white px-3 py-2 flex items-center justify-between cursor-pointer border-b border-neutral-900 select-none hover:bg-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[11px] tracking-wide text-white uppercase font-mono">
                  A. TENAGA KERJA
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 font-medium">Subtotal</span>
                <span className="text-[11px] font-bold text-white font-mono">
                  {formatRupiah(totalTenaga)}
                </span>
                {showTenaga ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>

            {showTenaga && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 text-[10px] font-bold font-mono border-b border-slate-200 dark:border-white/10 divide-x divide-slate-200 dark:divide-white/10 whitespace-nowrap">
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">No</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[140px]">Uraian</th>
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">Satuan</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Koefisien</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Harga Satuan (Rp)</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px]">
                    {tenagaLines.length > 0 ? (
                      tenagaLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors divide-x divide-slate-200 dark:divide-white/10">
                          <td className="py-1 px-2 text-center text-slate-500 font-mono text-[10px] whitespace-nowrap">{idx + 1}</td>
                          <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 min-w-[140px] leading-snug">{line.component.name}</td>
                          <td className="py-1 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">{line.component.unit}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatKoefisien(line.coefficient)}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.unitPrice)}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-white font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.totalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-2.5 text-center text-[10px] text-slate-400 italic">
                          Tidak ada komponen tenaga kerja
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION B: BAHAN */}
          <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-2xs">
            <div 
              onClick={() => setShowBahan(!showBahan)}
              className="bg-black text-white px-3 py-2 flex items-center justify-between cursor-pointer border-b border-neutral-900 select-none hover:bg-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[11px] tracking-wide text-white uppercase font-mono">
                  B. BAHAN
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 font-medium">Subtotal</span>
                <span className="text-[11px] font-bold text-white font-mono">
                  {formatRupiah(totalBahan)}
                </span>
                {showBahan ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>

            {showBahan && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 text-[10px] font-bold font-mono border-b border-slate-200 dark:border-white/10 divide-x divide-slate-200 dark:divide-white/10 whitespace-nowrap">
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">No</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[140px]">Uraian</th>
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">Satuan</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Koefisien</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Harga Satuan (Rp)</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px]">
                    {bahanLines.length > 0 ? (
                      bahanLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors divide-x divide-slate-200 dark:divide-white/10">
                          <td className="py-1 px-2 text-center text-slate-500 font-mono text-[10px] whitespace-nowrap">{idx + 1}</td>
                          <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 min-w-[140px] leading-snug">{line.component.name}</td>
                          <td className="py-1 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">{line.component.unit}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatKoefisien(line.coefficient)}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.unitPrice)}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-white font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.totalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-2.5 text-center text-[10px] text-slate-400 italic">
                          Tidak ada komponen bahan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION C: ALAT */}
          <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-2xs">
            <div 
              onClick={() => setShowAlat(!showAlat)}
              className="bg-black text-white px-3 py-2 flex items-center justify-between cursor-pointer border-b border-neutral-900 select-none hover:bg-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[11px] tracking-wide text-white uppercase font-mono">
                  C. ALAT
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 font-medium">Subtotal</span>
                <span className="text-[11px] font-bold text-white font-mono">
                  {formatRupiah(totalAlat)}
                </span>
                {showAlat ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>

            {showAlat && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 text-[10px] font-bold font-mono border-b border-slate-200 dark:border-white/10 divide-x divide-slate-200 dark:divide-white/10 whitespace-nowrap">
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">No</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[140px]">Uraian</th>
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">Satuan</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Koefisien</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Harga Satuan (Rp)</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px]">
                    {alatLines.length > 0 ? (
                      alatLines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors divide-x divide-slate-200 dark:divide-white/10">
                          <td className="py-1 px-2 text-center text-slate-500 font-mono text-[10px] whitespace-nowrap">{idx + 1}</td>
                          <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 min-w-[140px] leading-snug">{line.component.name}</td>
                          <td className="py-1 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">{line.component.unit}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatKoefisien(line.coefficient)}</td>
                          <td className="py-1 px-2 text-right text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.unitPrice)}</td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-white font-mono text-[10px] whitespace-nowrap">{formatNumberDot(line.totalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-2.5 text-center text-[10px] text-slate-400 italic">
                          Tidak ada komponen alat
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION D: OVERHEAD & PROFIT */}
          <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden shadow-2xs">
            <div 
              onClick={() => setShowOverhead(!showOverhead)}
              className="bg-black text-white px-3 py-2 flex items-center justify-between cursor-pointer border-b border-neutral-900 select-none hover:bg-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="font-bold text-[11px] tracking-wide text-white uppercase font-mono">
                  D. OVERHEAD & PROFIT
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/70 font-medium">Nilai</span>
                <span className="text-[11px] font-bold text-white font-mono">
                  {formatRupiah(overheadAmount)}
                </span>
                {showOverhead ? (
                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>

            {showOverhead && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 text-[10px] font-bold font-mono border-b border-slate-200 dark:border-white/10 divide-x divide-slate-200 dark:divide-white/10 whitespace-nowrap">
                      <th className="py-1.5 px-2 text-center whitespace-nowrap w-10">No</th>
                      <th className="py-1.5 px-2 text-left whitespace-nowrap min-w-[140px]">Uraian</th>
                      <th className="py-1.5 px-2 text-center whitespace-nowrap">Persentase</th>
                      <th className="py-1.5 px-2 text-right whitespace-nowrap">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-[11px]">
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors divide-x divide-slate-200 dark:divide-white/10">
                      <td className="py-1 px-2 text-center text-slate-500 font-mono text-[10px] whitespace-nowrap">1</td>
                      <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 min-w-[140px] leading-snug">
                        Jumlah Biaya Tenaga, Bahan & Alat (A + B + C)
                      </td>
                      <td className="py-1 px-2 text-center text-slate-600 dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">-</td>
                      <td className="py-1 px-2 text-right font-medium text-slate-800 dark:text-slate-200 font-mono text-[10px] whitespace-nowrap">
                        {formatNumberDot(subtotalDasar)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors divide-x divide-slate-200 dark:divide-white/10">
                      <td className="py-1 px-2 text-center text-slate-500 font-mono text-[10px] whitespace-nowrap">2</td>
                      <td className="py-1 px-2 font-medium text-slate-800 dark:text-slate-200 min-w-[140px] leading-snug">
                        Biaya Overhead & Profit ({overheadPct}%)
                      </td>
                      <td className="py-1 px-2 text-center font-bold text-slate-700 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">
                        {overheadPct}%
                      </td>
                      <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-white font-mono text-[10px] whitespace-nowrap">
                        {formatNumberDot(overheadAmount)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100/80 dark:bg-white/[0.05] font-bold divide-x divide-slate-200 dark:divide-white/10 border-t border-slate-200 dark:border-white/10">
                      <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300 font-mono text-[10px] whitespace-nowrap">Σ</td>
                      <td colSpan={2} className="py-1.5 px-2 text-slate-900 dark:text-white font-mono text-[11px] uppercase tracking-wide">
                        Total Harga Satuan Pekerjaan
                      </td>
                      <td className="py-1.5 px-2 text-right font-black text-slate-950 dark:text-white font-mono text-[11px] whitespace-nowrap">
                        {formatNumberDot(totalHargaSatuan)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 3. MODAL FOOTER ACTIONS */}
        <div className={`p-2.5 border-t flex items-center justify-end gap-2 shrink-0 ${
          isDark ? 'bg-[#1E1E1E] border-white/10' : 'bg-slate-50/90 border-slate-200'
        }`}>
          {/* Right Buttons: Edit, Duplikat & Tutup */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setEditingAhsp(ahsp);
                setActiveTab('input_ahsp');
                setSelectedDetailCalc(null);
              }}
              className="px-3 py-1.5 rounded-md bg-[#1e293b] hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Edit AHSP ini"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                duplicateAHSP(ahsp.id);
                setSelectedDetailCalc(null);
              }}
              className="px-3 py-1.5 rounded-md bg-[#1e293b] hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Duplikasi AHSP ini untuk variasi baru"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Duplikat</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDetailCalc(null)}
              className="px-4 py-1.5 rounded-md bg-[#1d4ed8] hover:bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
