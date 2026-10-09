import React, { useState, useRef, useEffect } from 'react';
import { Minus, X, Settings, Square, Copy } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { desktopWindow } from '../../utils/desktopWindow';

interface CompactTitleBarProps {
  onOpenSettings: () => void;
  onOpenKelolaDaerah: () => void;
  onOpenKelolaSatuan: () => void;
}

export const CompactTitleBar: React.FC<CompactTitleBarProps> = ({ 
  onOpenSettings, 
  onOpenKelolaDaerah,
  onOpenKelolaSatuan
}) => {
  const { settings } = useRabApp();
  const isDark = settings.theme === 'dark';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const startWindowDrag = async () => {
    await desktopWindow.startDragging();
  };

  const syncMaximizedState = async () => {
    setIsMaximized(await desktopWindow.isMaximized());
  };

  const toggleMaximize = async () => {
    setIsMaximized(await desktopWindow.toggleMaximize());
  };

  const handleTitlebarDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) {
      void toggleMaximize();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    void syncMaximizedState();
    const handleResize = () => void syncMaximizedState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`h-8 select-none flex items-center px-2.5 text-xs shrink-0 relative transition-colors duration-150 ${
      isDark 
        ? 'bg-[#121212] text-[#888888] border-b border-white/10' 
        : 'bg-[#0F172A] text-slate-300 border-b border-slate-800'
    }`}>
      {/* Left: App Identity */}
      <div
        onMouseDown={(event) => { if (event.button === 0 && event.detail < 2) void startWindowDrag(); }}
        onDoubleClick={handleTitlebarDoubleClick}
        className="flex items-center gap-2 cursor-default"
      >
        <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center font-bold text-[9px] shadow-xs text-white font-mono">
          RV
        </div>
        <span className="font-bold tracking-wide text-[11px] text-white font-mono">
          RAB VIEWER
        </span>
      </div>

      <div
        onMouseDown={(event) => { if (event.button === 0 && event.detail < 2) void startWindowDrag(); }}
        onDoubleClick={handleTitlebarDoubleClick}
        className="flex-1 h-full cursor-default"
        aria-hidden="true"
      />

      {/* Right: Settings & Window Controls */}
      <div className="flex items-center gap-0.5 h-full">
        {/* Settings button with dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Menu Pengaturan & Daerah"
            aria-label="Menu Pengaturan & Daerah"
            className={`p-1 rounded transition-colors cursor-pointer mr-1 ${
              isMenuOpen 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* DROPDOWN MENU */}
          {isMenuOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-44 rounded-lg shadow-xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
              isDark 
                ? 'bg-[#1E1E1E] border-white/15 text-slate-200' 
                : 'bg-white border-slate-200 text-slate-800 shadow-lg'
            }`}>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenKelolaDaerah();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Kelola Daerah</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenKelolaSatuan();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Kelola Satuan</span>
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-white/10" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Pengaturan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-3 w-px bg-white/20 mx-1" />

        {/* Desktop window controls (Minimize, Maximize/Restore, Close) */}
        <button
          type="button"
          onClick={() => desktopWindow.minimize()}
            className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Minimize Application"
          aria-label="Minimize Application"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => void toggleMaximize()}
          className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title={isMaximized ? 'Restore Application' : 'Maximize Application'}
          aria-label={isMaximized ? 'Restore Application' : 'Maximize Application'}
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => desktopWindow.close()}
          className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
          title="Close Application"
          aria-label="Close Application"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
