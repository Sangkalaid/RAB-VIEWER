import React, { useEffect, useState } from 'react';
import { RabAppProvider, useRabApp } from './context/RabAppContext';
import { CompactTitleBar } from './components/layout/CompactTitleBar';
import { CekHargaTab } from './components/compact/CekHargaTab';
import { InputAhspTab } from './components/compact/InputAhspTab';
import { InputHargaTab } from './components/compact/InputHargaTab';
import { KalkulatorRabTab } from './components/compact/KalkulatorRabTab';
import { AhspDetailModal } from './components/dialogs/AhspDetailModal';
import { CompareRegionsModal } from './components/dialogs/CompareRegionsModal';
import { RabSettingsModal } from './components/dialogs/RabSettingsModal';
import { KelolaDaerahModal } from './components/dialogs/KelolaDaerahModal';
import { KelolaSatuanModal } from './components/dialogs/KelolaSatuanModal';
import { ToastContainer } from './components/layout/ToastContainer';
import { RefreshCw } from 'lucide-react';

const RabViewerAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isKelolaSatuanOpen,
    setIsKelolaSatuanOpen,
    selectedDetailCalc,
    setSelectedDetailCalc,
    comparisonAhspId,
    setComparisonAhspId,
    settings,
    connectionStatus,
    isRefreshing,
    lastSync,
    refreshData
  } = useRabApp();

  const isDark = settings.theme === 'dark';
  const [isKelolaDaerahOpen, setIsKelolaDaerahOpen] = useState(false);
  const isOnlineStatus = connectionStatus === 'online' || (connectionStatus === 'loading' && lastSync);
  const statusLabel = isOnlineStatus
    ? 'ONLINE'
    : connectionStatus === 'loading'
      ? 'ONLINE'
      : connectionStatus === 'not_configured'
        ? 'API BELUM DIATUR'
        : 'OFFLINE';

  // Sync dark class to html document for Tailwind dark: variants
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Global keyboard shortcuts (Ctrl+F, Ctrl+N, strict topmost Esc stack)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + F -> Focus search on Cek Harga tab from any tab
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveTab('cek_harga');
        window.dispatchEvent(new CustomEvent('rab_focus_search'));
        return;
      }

      // Ctrl + N -> Switch to Input AHSP without clearing draft
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('input_ahsp');
        return;
      }

      // Esc -> Strict topmost active modal layer closing
      if (e.key === 'Escape') {
        if (comparisonAhspId) {
          setComparisonAhspId(null);
          return;
        }
        if (selectedDetailCalc) {
          setSelectedDetailCalc(null);
          return;
        }
        if (isKelolaDaerahOpen) {
          setIsKelolaDaerahOpen(false);
          return;
        }
        if (isKelolaSatuanOpen) {
          setIsKelolaSatuanOpen(false);
          return;
        }
        if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setActiveTab,
    comparisonAhspId,
    setComparisonAhspId,
    selectedDetailCalc,
    setSelectedDetailCalc,
    isKelolaDaerahOpen,
    isKelolaSatuanOpen,
    setIsKelolaSatuanOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen
  ]);

  return (
    <>
      <div 
        className={`w-full h-full flex flex-col overflow-hidden transition-colors ${
          isDark 
            ? 'dark bg-[#181818] border-white/10 text-[#E4E4E4]' 
            : 'bg-white text-slate-800'
        }`}
        style={{ minWidth: '340px', minHeight: 0 }}
      >
        {/* 1. TITLE BAR */}
        <CompactTitleBar
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenKelolaDaerah={() => setIsKelolaDaerahOpen(true)}
          onOpenKelolaSatuan={() => setIsKelolaSatuanOpen(true)}
        />

        {/* 2. HEADER */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#1E293B] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div>
            <h1 className={`text-sm font-bold tracking-tight leading-none uppercase font-heading ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              RAB VIEWER
            </h1>
            <p className={`text-[11px] mt-0.5 font-mono ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Database Harga & AHSP
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className={`font-semibold ${statusLabel === 'ONLINE' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={isRefreshing}
              className="rounded border px-2 py-1 font-bold hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-75 inline-flex items-center gap-1.5"
              aria-label={isRefreshing ? 'Refreshing data MRV' : 'Refresh data MRV'}
              title={isRefreshing ? 'Refreshing data MRV' : 'Refresh data MRV'}
            >
              {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin" />}
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* 3. FOUR MAIN TABS */}
        <div className={`flex p-1 gap-1 border-b shrink-0 text-xs ${
          isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-[#E2E8F0] border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('cek_harga')}
            className={`flex-1 py-1.5 rounded font-bold transition-colors text-center cursor-pointer text-[11px] ${
              activeTab === 'cek_harga'
                ? isDark
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs'
                : isDark 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            CEK HARGA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('input_ahsp')}
            className={`flex-1 py-1.5 rounded font-bold transition-colors text-center cursor-pointer text-[11px] ${
              activeTab === 'input_ahsp'
                ? isDark
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs'
                : isDark 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            INPUT AHSP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('input_harga')}
            className={`flex-1 py-1.5 rounded font-bold transition-colors text-center cursor-pointer text-[11px] ${
              activeTab === 'input_harga'
                ? isDark
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs'
                : isDark 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            INPUT HARGA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kalkulator')}
            className={`flex-1 py-1.5 rounded font-bold transition-colors text-center cursor-pointer text-[11px] ${
              activeTab === 'kalkulator'
                ? isDark
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs'
                : isDark 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            KALKULATOR
          </button>
        </div>

        {/* 4. ACTIVE TAB VIEW */}
        <main className={`flex-1 flex flex-col min-h-0 overflow-hidden relative ${
          isDark ? 'bg-[#181818]' : 'bg-white'
        }`}>
          <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'cek_harga' ? '' : 'hidden'}`}>
            <CekHargaTab />
          </div>
          <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'input_ahsp' ? '' : 'hidden'}`}>
            <InputAhspTab />
          </div>
          <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'input_harga' ? '' : 'hidden'}`}>
            <InputHargaTab />
          </div>
          <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'kalkulator' ? '' : 'hidden'}`}>
            <KalkulatorRabTab />
          </div>
        </main>
      </div>

      {/* MODALS */}
      <AhspDetailModal />
      <CompareRegionsModal />
      <RabSettingsModal />
      <KelolaDaerahModal 
        isOpen={isKelolaDaerahOpen} 
        onClose={() => setIsKelolaDaerahOpen(false)} 
      />
      <KelolaSatuanModal 
        isOpen={isKelolaSatuanOpen} 
        onClose={() => setIsKelolaSatuanOpen(false)} 
      />
      <ToastContainer />
    </>
  );
};

const BrowserPreviewShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useRabApp();
  const isDark = settings.theme === 'dark';
  return (
    <div className={`h-dvh w-screen overflow-hidden select-none transition-colors duration-150 ${
      isDark ? 'dark bg-[#181818]' : 'bg-white'
    }`}>
      {children}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <RabAppProvider>
      <BrowserPreviewShell>
        <RabViewerAppContent />
      </BrowserPreviewShell>
    </RabAppProvider>
  );
};

export default App;
