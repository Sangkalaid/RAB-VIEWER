import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import {
  Region,
  Category,
  UnitItem,
  ComponentItem,
  RegionalPrice,
  AHSPItem,
  AHSPCalculationResult,
  RabAppSettings,
  RegionalComparisonEntry
} from '../types/rab';
import { rabDb, MASTER_REGIONS, MASTER_CATEGORIES, MASTER_UNITS, MrvAhspRecord, MrvHargaRecord } from '../db/rabDatabase';

export type MainRabTab = 'cek_harga' | 'input_ahsp' | 'input_harga' | 'kalkulator';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface RabAppContextType {
  // Navigation
  activeTab: MainRabTab;
  setActiveTab: (tab: MainRabTab) => void;

  // Selected Query & Filter State
  selectedRegionId: string;
  setSelectedRegionId: (regId: string) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  submittedQuery: string;
  searchStatus: 'idle' | 'searching' | 'success' | 'empty' | 'error';
  searchSuggestions: string[];
  executeSearch: (query?: string) => Promise<void>;
  clearSearch: () => void;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;

  // Data
  regions: Region[];
  categories: Category[];
  units: UnitItem[];
  settings: RabAppSettings;
  searchHistory: string[];
  searchResults: AHSPCalculationResult[];

  // Modals & Details
  selectedDetailCalc: AHSPCalculationResult | null;
  setSelectedDetailCalc: (calc: AHSPCalculationResult | null) => void;
  comparisonAhspId: string | null;
  setComparisonAhspId: (ahspId: string | null) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isKelolaSatuanOpen: boolean;
  setIsKelolaSatuanOpen: (open: boolean) => void;

  // Editing / Duplicating state for Input AHSP
  editingAhsp: AHSPItem | null;
  setEditingAhsp: (ahsp: AHSPItem | null) => void;

  // Toasts
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;

  // Actions
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  updateSettings: (partial: Partial<RabAppSettings>) => void;
  duplicateAHSP: (ahspId: string) => void;
  deleteAHSP: (ahspId: string) => boolean;
  saveAHSP: (ahsp: Omit<AHSPItem, 'id' | 'created_at' | 'updated_at'>, existingId?: string) => Promise<AHSPItem>;
  saveHarga: (record: MrvHargaRecord, isUpdate: boolean) => Promise<void>;
  setRegionalPrice: (params: {
    componentId: string;
    regionId: string;
    price: number;
    year: number;
    source: string;
    notes?: string;
  }) => void;
  addComponent: (params: {
    name: string;
    type: 'bahan' | 'tenaga' | 'alat';
    unit: string;
    specification?: string;
  }) => ComponentItem;
  updateComponent: (id: string, updates: Partial<ComponentItem>) => ComponentItem;
  compareRegions: (ahspId: string) => RegionalComparisonEntry[];
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  connectionStatus: 'online' | 'offline' | 'not_configured' | 'loading';
  lastSync: string | null;
}

const RabAppContext = createContext<RabAppContextType | undefined>(undefined);

export const RabAppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<MainRabTab>('cek_harga');
  const [settings, setSettings] = useState<RabAppSettings>(rabDb.getSettings());
  const [selectedRegionId, setSelectedRegionId] = useState<string>(() => {
    return rabDb.getSettings().defaultRegionId || 'reg_yogyakarta';
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return rabDb.getSettings().defaultYear || 2026;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'success' | 'empty' | 'error'>('idle');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [regions, setRegions] = useState<Region[]>(MASTER_REGIONS);
  const [categories, setCategories] = useState<Category[]>(MASTER_CATEGORIES);
  const [units, setUnits] = useState<UnitItem[]>(MASTER_UNITS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<AHSPCalculationResult[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const searchSeqRef = useRef(0);
  const refreshSeqRef = useRef(0);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'not_configured' | 'loading'>(rabDb.apiConfigured ? 'loading' : 'not_configured');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Modals & Details
  const [selectedDetailCalc, setSelectedDetailCalc] = useState<AHSPCalculationResult | null>(null);
  const [comparisonAhspId, setComparisonAhspId] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isKelolaSatuanOpen, setIsKelolaSatuanOpen] = useState<boolean>(false);
  const [editingAhsp, setEditingAhsp] = useState<AHSPItem | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Sync state from Database
  const refreshData = useCallback(async () => {
    const seq = ++refreshSeqRef.current;
    refreshAbortRef.current?.abort();
    const controller = rabDb.apiConfigured ? new AbortController() : null;
    refreshAbortRef.current = controller;
    setIsRefreshing(true);
    try {
      if (rabDb.apiConfigured) {
        setConnectionStatus('loading');
        await rabDb.loadFromMRV(controller?.signal);
        if (seq !== refreshSeqRef.current) return;
        setConnectionStatus('online');
        setLastSync(new Date().toISOString());
      }

      const regList = rabDb.getRegions();
      const catList = rabDb.getCategories();
      const untList = rabDb.getUnits();
      const hist = rabDb.getSearchHistory();
      const sets = rabDb.getSettings();

      setRegions(regList);
      setCategories(catList);
      setUnits(untList);
      setSearchHistory(hist);
      setSettings(sets);

      // Update active detail calculation if open
      if (selectedDetailCalc) {
        const updated = rabDb.calculateAHSP(selectedDetailCalc.ahsp.id, selectedRegionId, selectedYear);
        setSelectedDetailCalc(updated);
      }
    } catch (error) {
      if (seq !== refreshSeqRef.current) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setConnectionStatus('offline');
      showToast(error instanceof Error ? error.message : 'Gagal menyinkronkan MRV', 'error');
    } finally {
      if (seq === refreshSeqRef.current) setIsRefreshing(false);
    }
  }, [selectedRegionId, selectedYear, selectedDetailCalc, showToast]);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    setSearchSuggestions(rabDb.getSearchSuggestions(searchQuery));
  }, [searchQuery]);

  useEffect(() => {
    if (!submittedQuery || searchStatus === 'idle' || searchStatus === 'searching') return;
    const recalculated = searchResults
      .map((calc) => rabDb.calculateAHSP(calc.ahsp.id, selectedRegionId, selectedYear))
      .filter((calc): calc is AHSPCalculationResult => Boolean(calc));
    setSearchResults(recalculated);
  }, [selectedRegionId, selectedYear]);

  const executeSearch = useCallback(async (query?: string) => {
    const normalized = (query ?? searchQuery).normalize('NFKD').trim().replace(/\s+/g, ' ');
    const seq = ++searchSeqRef.current;
    setSubmittedQuery(normalized);
    if (!normalized) {
      setSearchResults([]);
      setSearchStatus('idle');
      return;
    }
    setSearchStatus('searching');
    const started = Date.now();
    try {
      const results = rabDb.searchAHSP(normalized, selectedRegionId, selectedYear, selectedCategory);
      const wait = Math.max(0, 250 - (Date.now() - started));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      if (seq !== searchSeqRef.current) return;
      setSearchResults(results);
      setSearchStatus(results.length ? 'success' : 'empty');
      rabDb.addSearchHistory(normalized);
      setSearchHistory(rabDb.getSearchHistory());
    } catch (error) {
      if (seq !== searchSeqRef.current) return;
      setSearchResults([]);
      setSearchStatus('error');
      showToast(error instanceof Error ? error.message : 'Pencarian gagal', 'error');
    }
  }, [searchQuery, selectedRegionId, selectedYear, selectedCategory, showToast]);

  const clearSearch = useCallback(() => {
    searchSeqRef.current += 1;
    setSearchQuery('');
    setSubmittedQuery('');
    setSearchResults([]);
    setSearchStatus('idle');
    setSearchSuggestions([]);
  }, []);

  const addSearchHistory = useCallback((query: string) => {
    rabDb.addSearchHistory(query);
    setSearchHistory(rabDb.getSearchHistory());
  }, []);

  const clearSearchHistory = useCallback(() => {
    rabDb.clearSearchHistory();
    setSearchHistory([]);
    showToast('Riwayat pencarian dihapus', 'info');
  }, [showToast]);

  const updateSettings = useCallback((partial: Partial<RabAppSettings>) => {
    const updated = rabDb.updateSettings(partial);
    setSettings(updated);
    if (partial.defaultRegionId) setSelectedRegionId(partial.defaultRegionId);
    if (partial.defaultYear) setSelectedYear(partial.defaultYear);
    refreshData();
    showToast('Pengaturan berhasil disimpan', 'success');
  }, [refreshData, showToast]);

  const duplicateAHSP = useCallback((ahspId: string) => {
    try {
      const source = rabDb.getAHSPById(ahspId);
      if (!source) return;
      const dup = rabDb.duplicateAHSP(ahspId);
      refreshData();
      showToast(`AHSP "${dup.name}" berhasil diduplikasi`, 'success');
      setEditingAhsp(dup);
      setActiveTab('input_ahsp');
    } catch (err: any) {
      showToast(err.message || 'Gagal menduplikasi AHSP', 'error');
    }
  }, [refreshData, showToast]);

  const deleteAHSP = useCallback((ahspId: string) => {
    const deleted = rabDb.deleteAHSP(ahspId);
    if (deleted) {
      refreshData();
      showToast('AHSP berhasil dihapus', 'info');
      if (selectedDetailCalc?.ahsp.id === ahspId) setSelectedDetailCalc(null);
    }
    return deleted;
  }, [refreshData, selectedDetailCalc, showToast]);

  const saveAHSP = useCallback(async (ahspData: Omit<AHSPItem, 'id' | 'created_at' | 'updated_at'>, existingId?: string) => {
    const ahspRecord: MrvAhspRecord = {
      code: ahspData.code || '',
      category: categories.find(c => c.id === ahspData.category_id)?.name || ahspData.category_id,
      subcategory: ahspData.notes || '',
      name: ahspData.name,
      unit: ahspData.unit,
      reference: ahspData.reference,
      year: ahspData.year,
      components: ahspData.components.map((ref) => {
        const comp = rabDb.getComponentById(ref.component_id);
        if (!comp) throw new Error('Komponen AHSP tidak ditemukan pada data MRV terbaru.');
        const prices: Record<string, number> = {};
        rabDb.getRegions().forEach((region) => {
          prices[region.id] = rabDb.getPriceForComponent(comp.id, region.id, ahspData.year)?.price || 0;
        });
        return {
          type: ref.component_type,
          componentCode: comp.componentCode,
          variantId: comp.variantId,
          name: comp.name,
          unit: comp.unit,
          coefficient: ref.coefficient,
          prices
        };
      })
    };
    await rabDb.saveAHSPToMRV(ahspRecord, Boolean(existingId));
    await refreshData();
    const saved = rabDb.getAHSPEntries().find((item) => (
      (ahspRecord.code && item.code === ahspRecord.code) || item.name === ahspRecord.name || item.id === existingId
    )) || {
      ...ahspData,
      id: existingId || `mrv_pending_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    showToast(
      existingId ? `AHSP "${saved.name}" berhasil diperbarui di MRV` : `AHSP "${saved.name}" berhasil ditambahkan ke MRV`,
      'success'
    );
    return saved;
  }, [categories, refreshData, showToast]);

  const saveHarga = useCallback(async (record: MrvHargaRecord, isUpdate: boolean) => {
    await rabDb.saveHargaToMRV(record, isUpdate);
    await refreshData();
    showToast(
      isUpdate ? 'Harga berhasil diperbarui di MRV' : 'Harga baru berhasil disimpan ke MRV',
      'success'
    );
  }, [refreshData, showToast]);

  const setRegionalPrice = useCallback((params: {
    componentId: string;
    regionId: string;
    price: number;
    year: number;
    source: string;
    notes?: string;
  }) => {
    const res = rabDb.setRegionalPrice(params);
    refreshData();
    showToast(
      res.isUpdate ? 'Harga berhasil diperbarui di database' : 'Harga baru berhasil disimpan ke database',
      'success'
    );
  }, [refreshData, showToast]);

  const addComponent = useCallback((params: {
    name: string;
    type: 'bahan' | 'tenaga' | 'alat';
    unit: string;
    specification?: string;
  }) => {
    const comp = rabDb.addComponent(params);
    refreshData();
    return comp;
  }, [refreshData]);

  const updateComponent = useCallback((id: string, updates: Partial<ComponentItem>) => {
    const comp = rabDb.updateComponent(id, updates);
    refreshData();
    return comp;
  }, [refreshData]);

  const compareRegions = useCallback((ahspId: string) => {
    return rabDb.compareRegions(ahspId, selectedYear);
  }, [selectedYear]);

  return (
    <RabAppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedRegionId,
        setSelectedRegionId,
        selectedYear,
        setSelectedYear,
        searchQuery,
        setSearchQuery,
        submittedQuery,
        searchStatus,
        searchSuggestions,
        executeSearch,
        clearSearch,
        selectedCategory,
        setSelectedCategory,
        regions,
        categories,
        units,
        settings,
        searchHistory,
        searchResults,
        selectedDetailCalc,
        setSelectedDetailCalc,
        comparisonAhspId,
        setComparisonAhspId,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isKelolaSatuanOpen,
        setIsKelolaSatuanOpen,
        editingAhsp,
        setEditingAhsp,
        toasts,
        showToast,
        removeToast,
        addSearchHistory,
        clearSearchHistory,
        updateSettings,
        duplicateAHSP,
        deleteAHSP,
        saveAHSP,
        saveHarga,
        setRegionalPrice,
        addComponent,
        updateComponent,
        compareRegions,
        refreshData,
        isRefreshing,
        connectionStatus,
        lastSync
      }}
    >
      {children}
    </RabAppContext.Provider>
  );
};

export const useRabApp = () => {
  const context = useContext(RabAppContext);
  if (!context) {
    throw new Error('useRabApp must be used within a RabAppProvider');
  }
  return context;
};
