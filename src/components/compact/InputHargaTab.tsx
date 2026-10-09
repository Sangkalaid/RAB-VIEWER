import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Save, Plus, Check, Clock, ShieldCheck, ChevronDown, Search, X, Edit3, RotateCcw, Copy, MapPin, Tag, Trash2, AlertCircle, FileText } from 'lucide-react';
import { useRabApp } from '../../context/RabAppContext';
import { rabDb } from '../../db/rabDatabase';
import { ComponentType, SourceType, ComponentItem } from '../../types/rab';
import { formatRupiah, parseRupiahInput } from '../../utils/currency';

export const InputHargaTab: React.FC = () => {
  const {
    regions,
    units,
    selectedRegionId,
    setSelectedRegionId,
    setRegionalPrice,
    addComponent,
    updateComponent,
    saveHarga,
    settings,
    showToast,
    setIsKelolaSatuanOpen,
    lastSync
  } = useRabApp();

  const isDark = settings.theme === 'dark';

  // Active sub-tab: 'bahan' | 'tenaga' | 'alat'
  const [activeType, setActiveType] = useState<ComponentType>('bahan');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [priceSearchQuery, setPriceSearchQuery] = useState<string>('');
  const [submittedPriceSearchQuery, setSubmittedPriceSearchQuery] = useState<string>('');
  const [referenceSearchQuery, setReferenceSearchQuery] = useState<string>('');

  // Selected existing component ID for updating existing master data (null = input baru)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [parentComponentForVariant, setParentComponentForVariant] = useState<ComponentItem | null>(null);

  // Form State
  const [componentName, setComponentName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [unit, setUnit] = useState<string>('kg');
  const [source, setSource] = useState<string>('');
  const [sourceType, setSourceType] = useState<SourceType>('RESMI');
  const [year, setYear] = useState<number>(2026);
  const [notes, setNotes] = useState<string>('');

  // Map of regional prices: { [regionId]: priceString }
  const [regionalPricesMap, setRegionalPricesMap] = useState<Record<string, string>>({});

  // Dropdown / Combobox states
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const [isBrandComboboxOpen, setIsBrandComboboxOpen] = useState<boolean>(false);
  const [isCustomBrandMode, setIsCustomBrandMode] = useState<boolean>(false);
  const [selectedSearchVariantByGroup, setSelectedSearchVariantByGroup] = useState<Record<string, string>>({});

  const comboboxRef = useRef<HTMLDivElement>(null);
  const brandComboboxRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  // Close comboboxes on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsComboboxOpen(false);
      }
      if (brandComboboxRef.current && !brandComboboxRef.current.contains(e.target as Node)) {
        setIsBrandComboboxOpen(false);
      }
    };
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsComboboxOpen(false);
        setIsBrandComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDownGlobal);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDownGlobal);
    };
  }, []);

  // Helper to load all regional prices for a component and year
  const loadPricesForComponent = (compId: string | null, targetYear: number) => {
    if (!compId) {
      setRegionalPricesMap({});
      return;
    }
    const newMap: Record<string, string> = {};
    let firstFoundSource = '';
    let firstFoundType: SourceType = 'RESMI';
    let firstFoundNotes = '';

    regions.forEach((reg) => {
      const p = rabDb.getPriceForComponent(compId, reg.id, targetYear);
      if (p) {
        newMap[reg.id] = Number(p.price).toLocaleString('id-ID');
        if (!firstFoundSource && p.source) firstFoundSource = p.source;
        if (p.source_type) firstFoundType = p.source_type;
        if (!firstFoundNotes && p.notes) firstFoundNotes = p.notes;
      }
    });

    setRegionalPricesMap(newMap);
    if (firstFoundSource) setSource(firstFoundSource);
    setSourceType(firstFoundType);
    if (firstFoundNotes) setNotes(firstFoundNotes);
  };

  // Sync prices if year changes while editing existing component
  useEffect(() => {
    if (selectedComponentId) {
      loadPricesForComponent(selectedComponentId, year);
    }
  }, [selectedComponentId, year, regions]);

  // Auto-set standard unit when switching sub-tab
  const handleTypeChange = (type: ComponentType) => {
    setActiveType(type);
    setViewMode('list');
    setPriceSearchQuery('');
    setSubmittedPriceSearchQuery('');
    setSelectedComponentId(null);
    setParentComponentForVariant(null);
    setComponentName('');
    setBrand('');
    setSource('');
    setRegionalPricesMap({});
    setNotes('');
    setIsComboboxOpen(false);
    setIsBrandComboboxOpen(false);
    if (type === 'tenaga') setUnit('OH');
    else if (type === 'alat') setUnit('hari');
    else setUnit('kg');
  };

  const handleSelectExistingComponent = (comp: ComponentItem) => {
    setViewMode('form');
    setSelectedComponentId(comp.id);
    setParentComponentForVariant(null);
    setComponentName(comp.name);
    setUnit(comp.unit);
    const componentBrand = comp.brand?.trim() || 'Non Merek';
    setBrand(componentBrand);

    // Load prices for all regions
    loadPricesForComponent(comp.id, year);

    showToast(`Memuat data master & harga "${comp.name}" [${componentBrand}]`, 'info');
    setIsComboboxOpen(false);
  };

  const handleSwitchToNewInput = () => {
    setViewMode('form');
    setSelectedComponentId(null);
    setParentComponentForVariant(null);
    setComponentName('');
    setBrand('');
    setSource('');
    setSourceType('RESMI');
    setRegionalPricesMap({});
    setNotes('');
    if (activeType === 'tenaga') setUnit('OH');
    else if (activeType === 'alat') setUnit('hari');
    else setUnit('kg');
    setIsComboboxOpen(false);
    setIsBrandComboboxOpen(false);
    setReferenceSearchQuery('');
    showToast('Beralih ke mode Input Data Baru', 'info');
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleAddVariantForComponent = (comp: ComponentItem) => {
    setViewMode('form');
    setSelectedComponentId(null);
    setParentComponentForVariant(comp);
    setComponentName('');
    setUnit(comp.unit);
    setBrand('');
    setSource('');
    setSourceType('RESMI');
    setRegionalPricesMap({});
    setNotes('');
    setReferenceSearchQuery('');
    setIsComboboxOpen(false);
    setIsBrandComboboxOpen(false);
    setIsCustomBrandMode(true);
    showToast(`Tambah merek/varian baru untuk kode ${comp.componentCode || comp.name}`, 'info');
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);
  };

  const handleCancelForm = () => {
    setViewMode('list');
    setSelectedComponentId(null);
    setParentComponentForVariant(null);
    setComponentName('');
    setBrand('');
    setSource('');
    setSourceType('RESMI');
    setRegionalPricesMap({});
    setNotes('');
    setReferenceSearchQuery('');
    if (activeType === 'tenaga') setUnit('OH');
    else if (activeType === 'alat') setUnit('hari');
    else setUnit('kg');
    setIsComboboxOpen(false);
    setIsBrandComboboxOpen(false);
    setIsCustomBrandMode(false);
    setPriceSearchQuery('');
    setSubmittedPriceSearchQuery('');
  };

  const handleSelectBrand = (selectedBrand: string) => {
    const cleanBrand = selectedBrand.trim() || 'Non Merek';
    setBrand(cleanBrand);
    setIsBrandComboboxOpen(false);

    if (selectedComponentId || parentComponentForVariant) {
      return;
    }

    if (componentName.trim()) {
      const comp = rabDb.findComponentByNameAndBrand(componentName.trim(), cleanBrand, activeType);
      if (comp) {
        setSelectedComponentId(comp.id);
        setUnit(comp.unit);
        loadPricesForComponent(comp.id, year);
        showToast(`Memuat harga "${comp.name}" [Merek: ${cleanBrand}]`, 'info');
      } else {
        setSelectedComponentId(null);
      }
    }
  };

  const handleBrandInputChange = (val: string) => {
    setBrand(val);
    if (selectedComponentId || parentComponentForVariant) {
      return;
    }
    const cleanBrand = val.trim() || 'Non Merek';
    if (componentName.trim()) {
      const comp = rabDb.findComponentByNameAndBrand(componentName.trim(), cleanBrand, activeType);
      if (comp) {
        setSelectedComponentId(comp.id);
        setUnit(comp.unit);
        loadPricesForComponent(comp.id, year);
      } else {
        setSelectedComponentId(null);
      }
    }
  };

  const handlePriceChange = (regId: string, val: string) => {
    const digitsOnly = val.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setRegionalPricesMap((prev) => ({
        ...prev,
        [regId]: ''
      }));
      return;
    }
    const formatted = Number(digitsOnly).toLocaleString('id-ID');
    setRegionalPricesMap((prev) => ({
      ...prev,
      [regId]: formatted
    }));
  };

  const handleCopyFirstPriceToAll = () => {
    // Find first non-empty price entered
    const firstNonEmptyEntry = Object.entries(regionalPricesMap).find(([_, v]) => v && v.trim() !== '');
    if (!firstNonEmptyEntry) {
      showToast('Isi harga pada salah satu daerah terlebih dahulu', 'warning');
      return;
    }
    const valToCopy = firstNonEmptyEntry[1];
    const newMap: Record<string, string> = {};
    regions.forEach((reg) => {
      newMap[reg.id] = valToCopy;
    });
    setRegionalPricesMap(newMap);
    showToast(`Harga Rp ${valToCopy} disalin ke semua daerah`, 'success');
  };

  const handleClearAllPrices = () => {
    setRegionalPricesMap({});
    showToast('Semua input harga dibersihkan', 'info');
  };

  const handleDeletePriceData = (component: ComponentItem) => {
    showToast(`Hapus data "${component.name}" belum diaktifkan karena endpoint delete MRV belum tersedia. Data production tidak diubah.`, 'warning');
  };

  const handleUseReferenceData = (component: ComponentItem) => {
    const componentBrand = component.brand?.trim() || 'Non Merek';
    setSelectedComponentId(null);
    setComponentName(component.name);
    setUnit(component.unit);
    setBrand(componentBrand);
    setSource('');
    setSourceType('RESMI');
    setNotes('');
    loadPricesForComponent(component.id, year);
    setReferenceSearchQuery('');
    setIsCustomBrandMode(false);
    showToast(`Referensi "${component.name}" dimuat. Data akan disimpan sebagai input baru.`, 'info');
  };

  const existingComponentsOfThisType = useMemo(() => {
    return rabDb.getComponents(activeType);
  }, [activeType, lastSync]);

  const isNonBrand = (value?: string) => {
    const normalized = value?.trim().toLowerCase();
    return !normalized || normalized === 'non merek' || normalized === 'tanpa merek';
  };

  const hasBrandedVariantByName = useMemo(() => {
    const brandedNames = new Set<string>();
    existingComponentsOfThisType.forEach((component) => {
      if (!isNonBrand(component.brand)) {
        brandedNames.add(component.name.trim().toLowerCase());
      }
    });
    return brandedNames;
  }, [existingComponentsOfThisType]);

  const ahspUsedComponentCodes = useMemo(() => {
    const codes = new Set<string>();
    rabDb.getAHSPEntries().forEach((ahsp) => {
      ahsp.components.forEach((component) => {
        if (component.componentCode) codes.add(component.componentCode);
      });
    });
    return codes;
  }, [lastSync]);

  const groupedComponentsForPriceSearch = useMemo(() => {
    const groups = new Map<string, { key: string; parent: ComponentItem; variants: ComponentItem[] }>();
    existingComponentsOfThisType.forEach((component) => {
      if (ahspUsedComponentCodes.size > 0 && component.componentCode && !ahspUsedComponentCodes.has(component.componentCode)) return;
      const key = component.componentCode || component.name.trim().toLowerCase();
      const existing = groups.get(key);
      if (existing) {
        existing.variants.push(component);
        const existingBrandless = isNonBrand(existing.parent.brand);
        if (existingBrandless && !isNonBrand(component.brand)) existing.parent = component;
      } else {
        groups.set(key, { key, parent: component, variants: [component] });
      }
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      variants: group.variants.sort((a, b) => {
        const brandA = (a.brand || 'Non Merek').localeCompare(b.brand || 'Non Merek');
        return brandA || (a.specification || '').localeCompare(b.specification || '');
      })
    }));
  }, [existingComponentsOfThisType, ahspUsedComponentCodes]);

  // Filtered components based on user typing
  const filteredComponents = useMemo(() => {
    const q = componentName.trim().toLowerCase();
    const seenDisplayKeys = new Set<string>();
    return existingComponentsOfThisType.filter((c) => {
      const componentNameKey = c.name.trim().toLowerCase();
      if (isNonBrand(c.brand) && hasBrandedVariantByName.has(componentNameKey)) return false;
      const brandKey = isNonBrand(c.brand) ? 'non merek' : c.brand?.trim().toLowerCase() || 'non merek';
      const displayKey = [componentNameKey, brandKey].join('|');
      if (seenDisplayKeys.has(displayKey)) return false;
      seenDisplayKeys.add(displayKey);
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.specification && c.specification.toLowerCase().includes(q)) ||
        c.unit.toLowerCase().includes(q)
      );
    });
  }, [existingComponentsOfThisType, componentName, hasBrandedVariantByName]);

  const priceSearchResults = useMemo(() => {
    const q = submittedPriceSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return groupedComponentsForPriceSearch
      .filter((group) => {
        const parent = group.parent;
        return (
          parent.name.toLowerCase().includes(q) ||
          parent.unit.toLowerCase().includes(q) ||
          (parent.componentCode || '').toLowerCase().includes(q) ||
          group.variants.some((variant) => (
            (variant.brand || '').toLowerCase().includes(q) ||
            (variant.specification || '').toLowerCase().includes(q) ||
            (variant.variantId || '').toLowerCase().includes(q)
          ))
        );
      })
      .slice(0, 80);
  }, [groupedComponentsForPriceSearch, submittedPriceSearchQuery]);

  const referenceResults = useMemo(() => {
    const q = referenceSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const seenDisplayKeys = new Set<string>();
    return existingComponentsOfThisType
      .filter((component) => {
        const componentNameKey = component.name.trim().toLowerCase();
        if (selectedComponentId === component.id) return false;
        if (isNonBrand(component.brand) && hasBrandedVariantByName.has(componentNameKey)) return false;
        const brandKey = isNonBrand(component.brand) ? 'non merek' : component.brand?.trim().toLowerCase() || 'non merek';
        const displayKey = [componentNameKey, brandKey].join('|');
        if (seenDisplayKeys.has(displayKey)) return false;
        seenDisplayKeys.add(displayKey);
        return (
          component.name.toLowerCase().includes(q) ||
          (component.brand || '').toLowerCase().includes(q) ||
          (component.specification || '').toLowerCase().includes(q) ||
          component.unit.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  }, [existingComponentsOfThisType, referenceSearchQuery, hasBrandedVariantByName, selectedComponentId]);

  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    return rabDb.getComponentById(selectedComponentId) || null;
  }, [selectedComponentId]);

  // Available brands for the typed / selected component name
  const availableBrandsForCurrentComponent = useMemo(() => {
    if (selectedComponent) {
      const selectedBrand = selectedComponent.brand?.trim();
      return [isNonBrand(selectedBrand) ? 'Non Merek' : selectedBrand || 'Non Merek'];
    }

    const brandsSet = new Set<string>();

    const trimmed = componentName.trim().toLowerCase();
    if (!trimmed) return ['Non Merek'];

    let hasMatchingComponent = false;
    let hasBrandedComponent = false;
    let hasNonBrandComponent = false;
    existingComponentsOfThisType.forEach((c) => {
      // If exact match or selected component or matches name
      if (c.name.trim().toLowerCase() === trimmed) {
        hasMatchingComponent = true;
        const componentBrand = c.brand?.trim();
        if (isNonBrand(componentBrand)) {
          hasNonBrandComponent = true;
        } else {
          hasBrandedComponent = true;
          brandsSet.add(componentBrand || 'Non Merek');
        }
      }
    });

    if (!hasMatchingComponent) brandsSet.add('Non Merek');
    else if (!hasBrandedComponent && hasNonBrandComponent) brandsSet.add('Non Merek');
    return Array.from(brandsSet);
  }, [existingComponentsOfThisType, componentName, selectedComponent]);

  const firstAvailableBrandForCurrentComponent = () => availableBrandsForCurrentComponent[0] || 'Non Merek';

  const activeTypeLabel = activeType === 'bahan' ? 'Bahan / Material' : activeType === 'tenaga' ? 'Jasa / Tenaga' : 'Alat';
  const activeSearchLabel = activeType === 'bahan' ? 'CARI BAHAN / MATERIAL' : activeType === 'tenaga' ? 'CARI JASA / TENAGA' : 'CARI ALAT';
  const activeSearchPlaceholder = activeType === 'bahan'
    ? 'Cari nama bahan, merek, atau satuan...'
    : activeType === 'tenaga'
      ? 'Cari nama jasa/tenaga atau satuan...'
      : 'Cari nama alat atau satuan...';
  const formMode: 'edit_variant' | 'add_variant' | 'new_component' = selectedComponentId
    ? 'edit_variant'
    : parentComponentForVariant
      ? 'add_variant'
      : 'new_component';
  const formModeTitle = formMode === 'edit_variant'
    ? 'Edit Varian'
    : formMode === 'add_variant'
      ? 'Tambah Merek / Varian'
      : 'Buat Komponen Baru';
  const formModeDescription = formMode === 'edit_variant'
    ? 'Perubahan akan mengganti baris varian existing berdasarkan ID VARIAN. Kode komponen dan ID varian tidak berubah.'
    : formMode === 'add_variant'
      ? 'Varian baru memakai kode induk yang sama. ID varian dibuat otomatis oleh backend saat disimpan.'
      : 'Gunakan hanya untuk material/jasa/alat yang belum memiliki komponen induk. Kode komponen dan ID varian dibuat otomatis oleh backend.';
  const currentComponentCode = selectedComponent?.componentCode || parentComponentForVariant?.componentCode || 'Dibuat otomatis';
  const currentVariantId = selectedComponent?.variantId || (parentComponentForVariant ? 'Dibuat otomatis' : 'Dibuat otomatis');
  const hasActiveFormIdentity = Boolean(componentName.trim() || selectedComponentId || parentComponentForVariant);

  const isExistingMaterialSelected = useMemo(() => {
    if (selectedComponentId) return true;
    const trimmed = componentName.trim().toLowerCase();
    if (!trimmed) return false;
    return existingComponentsOfThisType.some(c => c.name.toLowerCase() === trimmed);
  }, [selectedComponentId, componentName, existingComponentsOfThisType]);

  // Count how many regions have a valid price filled in
  const filledPricesCount = useMemo(() => {
    return Object.values(regionalPricesMap).filter((v) => {
      if (!v) return false;
      const num = parseRupiahInput(v);
      return !isNaN(num) && num > 0;
    }).length;
  }, [regionalPricesMap]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = componentName.trim();
    if (!trimmedName) {
      showToast('Nama komponen tidak boleh kosong', 'error');
      nameInputRef.current?.focus();
      return;
    }

    // Default empty brand to 'Non Merek' as requested
    const finalBrand = brand.trim() ? brand.trim() : 'Non Merek';

    // Collect valid prices
    const validEntries: { regionId: string; price: number }[] = [];
    regions.forEach((reg) => {
      const raw = regionalPricesMap[reg.id];
      if (raw && raw.trim()) {
        const num = parseRupiahInput(raw);
        if (!isNaN(num) && num > 0) {
          validEntries.push({ regionId: reg.id, price: num });
        }
      }
    });

    if (validEntries.length === 0) {
      showToast('Masukkan harga minimal untuk 1 daerah', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const existingExact = rabDb.findComponentByNameAndBrand(trimmedName, finalBrand, activeType);
      const isAddingVariant = Boolean(parentComponentForVariant && !selectedComponentId);
      const isUpdating = !isAddingVariant && Boolean(selectedComponentId || existingExact);
      const existingForSave = selectedComponentId ? rabDb.getComponentById(selectedComponentId) : isAddingVariant ? parentComponentForVariant : existingExact;
      await saveHarga({
        type: activeType,
        componentCode: existingForSave?.componentCode,
        variantId: isAddingVariant ? undefined : existingForSave?.variantId,
        name: trimmedName,
        specification: existingForSave?.specification || '',
        brand: finalBrand,
        unit: unit.trim() || 'unit',
        year,
        source: source.trim() || notes.trim(),
        prices: Object.fromEntries(validEntries.map((entry) => [entry.regionId, entry.price])),
        original: existingForSave ? {
          type: existingForSave.type,
          componentCode: existingForSave.componentCode,
          variantId: existingForSave.variantId,
          name: existingForSave.name,
          specification: existingForSave.specification || '',
          brand: existingForSave.brand || 'Non Merek',
          unit: existingForSave.unit,
          year
        } : undefined
      }, isUpdating);

      // Sequential reset
      setComponentName('');
      setBrand('Non Merek');
      setRegionalPricesMap({});
      setNotes('');
      setSelectedComponentId(null);
      setParentComponentForVariant(null);
      setIsComboboxOpen(false);
      setIsBrandComboboxOpen(false);
      setViewMode('list');
      setPriceSearchQuery(trimmedName);
      setSubmittedPriceSearchQuery(trimmedName);

      if (isUpdating) {
        showToast(`Data "${trimmedName}" [${finalBrand}] dan harga ${validEntries.length} daerah berhasil diperbarui di MRV`, 'success');
      } else if (isAddingVariant) {
        showToast(`Varian baru "${trimmedName}" [${finalBrand}] untuk ${existingForSave?.componentCode || 'komponen'} berhasil disimpan ke MRV`, 'success');
      } else {
        showToast(`Komponen baru "${trimmedName}" [${finalBrand}] dan harga ${validEntries.length} daerah berhasil disimpan ke MRV`, 'success');
      }

      // Focus back to input
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan harga';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-[#181818] text-[#E4E4E4]' : 'bg-white text-slate-800'}`}>
      {/* 1. SUB-TABS: BAHAN | JASA / TENAGA | ALAT (TABEL BORDER) */}
      <div className={`grid grid-cols-3 border-y border-slate-300 dark:border-white/20 divide-x divide-slate-300 dark:divide-white/20 shrink-0 text-xs font-mono ${
        isDark ? 'bg-[#202020]' : 'bg-slate-100'
      }`}>
        <button
          type="button"
          onClick={() => handleTypeChange('bahan')}
          className={`py-2 px-1 transition-colors cursor-pointer text-center flex items-center justify-center tracking-wider font-extrabold ${
            activeType === 'bahan'
              ? 'bg-blue-600 text-white font-black'
              : isDark 
                ? 'bg-[#1e1e1e] text-slate-200 hover:bg-[#282828] hover:text-white font-extrabold' 
                : 'bg-[#F8FAFC] text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 font-extrabold'
          }`}
        >
          BAHAN
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('tenaga')}
          className={`py-2 px-1 transition-colors cursor-pointer text-center flex items-center justify-center tracking-wider font-extrabold ${
            activeType === 'tenaga'
              ? 'bg-blue-600 text-white font-black'
              : isDark 
                ? 'bg-[#1e1e1e] text-slate-200 hover:bg-[#282828] hover:text-white font-extrabold' 
                : 'bg-[#F8FAFC] text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 font-extrabold'
          }`}
        >
          JASA / TENAGA
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('alat')}
          className={`py-2 px-1 transition-colors cursor-pointer text-center flex items-center justify-center tracking-wide font-extrabold ${
            activeType === 'alat'
              ? 'bg-blue-600 text-white font-black'
              : isDark 
                ? 'bg-[#1e1e1e] text-slate-200 hover:bg-[#282828] hover:text-white font-extrabold' 
                : 'bg-[#F8FAFC] text-slate-800 hover:bg-slate-200/80 hover:text-slate-900 font-extrabold'
          }`}
        >
          ALAT
        </button>
      </div>

      {/* 2. LIST / SEARCH MODE */}
      {viewMode === 'list' ? (
        <>
          <div className={`p-3.5 border-b shrink-0 space-y-3 ${isDark ? 'bg-[#202020] border-white/10' : 'bg-[#F1F5F9] border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  {activeSearchLabel}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                {existingComponentsOfThisType.length} Data
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                Cari Data Harga
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmittedPriceSearchQuery(priceSearchQuery.trim());
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  placeholder={activeSearchPlaceholder}
                  className={`w-full h-9 pl-3 pr-16 text-xs border rounded-lg focus:outline-none shadow-2xs transition-colors ${
                    isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400'
                  }`}
                />
                {priceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceSearchQuery('');
                      setSubmittedPriceSearchQuery('');
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
              onClick={handleSwitchToNewInput}
              className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
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
              {submittedPriceSearchQuery.trim() ? `${priceSearchResults.length} Hasil` : '0 Hasil'}
            </span>
          </div>

          <div className={`flex-1 overflow-y-auto p-2 space-y-2 ${isDark ? 'bg-[#181818]' : 'bg-slate-50/60'}`}>
          {!submittedPriceSearchQuery.trim() ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}>
                <Search className="w-5 h-5 opacity-75" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Belum Ada Pencarian</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[320px] mx-auto leading-relaxed">
                Ketik nama {activeTypeLabel.toLowerCase()}, merek, atau satuan, lalu tekan Enter untuk melihat data harga.
              </p>
            </div>
          ) : priceSearchResults.length === 0 ? (
            <div className="min-h-[220px] flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-3" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Tidak Ada Data</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[320px] mx-auto leading-relaxed">
                Tidak ditemukan data yang sesuai. Klik Buat Baru untuk menambahkan data harga.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {priceSearchResults.map((group) => {
                const component = group.parent;
                const selectedVariantId = selectedSearchVariantByGroup[group.key] || group.variants[0]?.id || component.id;
                const selectedVariant = group.variants.find((variant) => variant.id === selectedVariantId) || group.variants[0] || component;
                const activePrice = rabDb.getPriceForComponent(selectedVariant.id, selectedRegionId, year);
                const activeRegion = regions.find((region) => region.id === selectedRegionId);
                const brandDisplay = selectedVariant.brand?.trim() || 'Non Merek';
                return (
                  <div
                    key={group.key}
                    className={`rounded-xl border p-3.5 transition-all ${
                      isDark ? 'bg-[#202020] border-white/10 hover:border-white/25' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold tracking-wide uppercase">
                        <Tag className="w-3 h-3" />
                        <span>{activeTypeLabel}</span>
                      </div>
                      <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px]">
                        {component.unit}
                      </div>
                    </div>

                    <div className="mb-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
                        {component.name}
                      </h3>
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Induk: {component.componentCode || '-'} · {group.variants.length} merek/varian tersedia
                      </div>
                    </div>

                    <div className="mb-2.5">
                      <label className="block mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Pilih Merek Untuk Lihat Harga
                      </label>
                      <div className="relative">
                        <select
                          value={selectedVariant.id}
                          onChange={(event) => setSelectedSearchVariantByGroup((prev) => ({
                            ...prev,
                            [group.key]: event.target.value
                          }))}
                          className={`w-full h-9 rounded-lg border pl-3 pr-8 text-[12px] font-semibold outline-none cursor-pointer appearance-none ${
                            isDark ? 'bg-[#151515] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          {group.variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {(variant.brand?.trim() || 'Non Merek')}{variant.specification ? ` — ${variant.specification}` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className={`rounded-xl border px-3 py-2.5 mb-2.5 ${
                      isDark ? 'bg-[#151515] border-white/5' : 'bg-slate-100/80 border-slate-200/50'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Harga {activeRegion?.name || 'Daerah Aktif'}
                          </div>
                          <div className="text-base font-extrabold text-slate-900 dark:text-white">
                            {activePrice ? formatRupiah(activePrice.price) : 'Belum Ada'}
                          </div>
                        </div>
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate">Merek: <strong>{brandDisplay}</strong></span>
                        {selectedVariant.variantId && <span className="truncate">ID: <strong>{selectedVariant.variantId}</strong></span>}
                        {activePrice?.source && <span className="truncate">Sumber: <strong>{activePrice.source}</strong></span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectExistingComponent(selectedVariant)}
                          className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        {component.componentCode && (
                          <button
                            type="button"
                            onClick={() => handleAddVariantForComponent(component)}
                            className="h-7 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Merek</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePriceData(component)}
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
        {parentComponentForVariant && (
          <section className={`rounded-xl border p-3.5 space-y-2 ${
            isDark ? 'bg-blue-950/20 border-blue-500/20' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Tambah Merek / Varian
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/10 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                {parentComponentForVariant.componentCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Varian baru akan memakai kode induk yang sama. ID varian baru dialokasikan backend saat simpan, tanpa membuat AHSP baru.
            </p>
            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              Induk: {parentComponentForVariant.name} · Satuan: {parentComponentForVariant.unit}
            </div>
          </section>
        )}

        {!selectedComponentId && !parentComponentForVariant && (
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
              Cari data yang sudah ada untuk menduplikasi struktur nama, merek, satuan, dan harga daerah. Jika tidak dipakai, form tetap kosong sesuai input baru.
            </p>
            <div className="relative flex items-center">
              <input
                type="text"
                value={referenceSearchQuery}
                onChange={(e) => setReferenceSearchQuery(e.target.value)}
                placeholder="Cari referensi dari data yang sudah ada..."
                style={{ paddingLeft: '2.75rem' }}
                className={`w-full h-9 pl-11 pr-8 text-xs rounded-lg border focus:outline-none ${
                  isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 placeholder:text-slate-400'
                }`}
              />
              <Search className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
              {referenceSearchQuery && (
                <button
                  type="button"
                  onClick={() => setReferenceSearchQuery('')}
                  className="absolute right-2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {referenceResults.length > 0 && (
              <div className="space-y-1">
                {referenceResults.map((component) => (
                  <button
                    key={component.id}
                    type="button"
                    onClick={() => handleUseReferenceData(component)}
                    className={`w-full rounded-lg border p-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isDark ? 'bg-[#161616] border-white/10 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold truncate text-slate-800 dark:text-slate-100">{component.name}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">Merek: {component.brand?.trim() || 'Non Merek'} · Sat: {component.unit}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-blue-600 dark:text-blue-400">Gunakan</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className={`rounded-xl border p-3.5 space-y-3.5 ${
          isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                {formModeTitle}
              </span>
            </div>
            {selectedComponentId && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                Mode Update
              </span>
            )}
            {parentComponentForVariant && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                Varian Baru
              </span>
            )}
            {!selectedComponentId && !parentComponentForVariant && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                Komponen Baru
              </span>
            )}
          </div>
          <div className={`rounded-lg border p-2.5 space-y-2 ${
            isDark ? 'bg-[#151515] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {formModeDescription}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-lg px-2.5 py-2 ${
                isDark ? 'bg-white/5' : 'bg-white border border-slate-200'
              }`}>
                <div className="text-[9px] font-bold uppercase text-slate-400">Kode Komponen</div>
                <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-100">{currentComponentCode}</div>
              </div>
              <div className={`rounded-lg px-2.5 py-2 ${
                isDark ? 'bg-white/5' : 'bg-white border border-slate-200'
              }`}>
                <div className="text-[9px] font-bold uppercase text-slate-400">ID Varian</div>
                <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-100">{currentVariantId}</div>
              </div>
            </div>
          </div>
        {/* 1. NAMA MATERIAL / TENAGA / ALAT */}
        <div className="relative" ref={comboboxRef}>
          <div className="flex items-center justify-between mb-1.5 gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">
                {activeType === 'bahan' ? (
                  <span>Nama Material / <strong className="font-semibold text-slate-500 dark:text-slate-400">Bahan</strong> *</span>
                ) : activeType === 'tenaga' ? (
                  <span>Jenis <strong className="font-semibold text-slate-500 dark:text-slate-400">Jasa / Tenaga</strong> *</span>
                ) : (
                  <span>Nama <strong className="font-semibold text-slate-500 dark:text-slate-400">Alat</strong> *</span>
                )}
              </label>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" />
          </div>

          <div className="relative flex items-center">
            <Tag className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
            <input
              ref={nameInputRef}
              type="text"
              required
              value={componentName}
              onFocus={() => {
                setIsComboboxOpen(false);
              }}
              onClick={() => {
                setIsComboboxOpen(false);
              }}
              onChange={(e) => {
                const newVal = e.target.value;
                setComponentName(newVal);

                const cleanVal = newVal.trim().toLowerCase();
                if (!cleanVal) {
                  if (!selectedComponentId && !parentComponentForVariant) {
                    setBrand('Non Merek');
                    setIsCustomBrandMode(false);
                  }
                  return;
                }

                if (selectedComponentId) {
                  // Mode edit adalah rename/update varian yang sama.
                  // Field ini bukan pencarian/dropdown. Jangan rebind ke data lain,
                  // jangan ganti ID VARIAN, dan jangan kosongkan harga saat rename.
                } else {
                  // Mode tambah merek / buat baru: nama boleh diketik bebas.
                  // Harga yang sudah diisi tidak boleh hilang hanya karena rename.
                  setBrand(prev => prev || 'Non Merek');
                  setIsCustomBrandMode(false);
                }

                setIsComboboxOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsComboboxOpen(false);
                }
              }}
              placeholder={
                selectedComponentId
                  ? `Mengedit komponen: "${selectedComponent?.name || ''}"`
                  : parentComponentForVariant
                    ? 'Ketik nama varian/merek baru...'
                    : activeType === 'bahan'
                      ? 'Ketik manual untuk komponen bahan baru...'
                      : activeType === 'tenaga'
                        ? 'Ketik manual untuk komponen jasa/tenaga baru...'
                        : 'Ketik manual untuk komponen alat baru...'
              }
              style={{ paddingLeft: '2.75rem' }}
              className={`w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border transition-all focus:outline-none ${
                isDark
                  ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'
              }`}
            />

          </div>

          {/* DROPDOWN LIST OF RECORDED DATA */}
          {false && selectedComponentId && isComboboxOpen && existingComponentsOfThisType.length > 0 && (
            <div className={`absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md border shadow-2xl z-50 p-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${
              isDark ? 'bg-[#202020] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="text-[10px] font-semibold uppercase font-mono text-slate-400 px-2 py-1 border-b border-white/10 flex items-center justify-between">
                <span>Pilih untuk Update Data Eksisting:</span>
                <span className="text-[9px] opacity-75">{filteredComponents.length} Data</span>
              </div>

              <div className="space-y-0.5 mt-1">
                {filteredComponents.length > 0 ? (
                  filteredComponents.map((c) => {
                    const isSelected = selectedComponentId === c.id;
                    const brandDisplay = c.brand?.trim() || 'Non Merek';
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectExistingComponent(c)}
                        className={`px-2.5 py-1.5 rounded cursor-pointer transition-colors flex items-center justify-between text-xs ${
                          isSelected
                            ? isDark ? 'bg-blue-600 text-white font-bold' : 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                            : isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="truncate min-w-0 pr-2">
                          <span className="font-semibold">{c.name}</span>
                          <span className="text-[10px] text-blue-500 dark:text-blue-400 ml-1.5 font-mono">
                            [{brandDisplay}]
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected ? (
                            <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-blue-500/30 text-blue-400">
                              Terpilih
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono opacity-60 text-slate-400">
                              Pilih
                            </span>
                          )}

                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-blue-500/30 text-blue-200'
                              : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-slate-400 text-[11px] italic font-mono">
                    Tidak ada nama yang cocok. Teks yang Anda ketik akan disimpan sebagai data baru.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. MEREK / BRAND (DIBAWAH NAMA MATERIAL DENGAN DROPDOWN OTOMATIS & NON MEREK) */}
        <div className="relative" ref={brandComboboxRef}>
          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
            Merek / Brand
          </label>

          {/* JIKA MODE INPUT MANUAL MEREK BARU */}
          {hasActiveFormIdentity && isCustomBrandMode ? (
            <div className="relative flex items-center">
              <Tag className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                ref={brandInputRef}
                type="text"
                value={brand}
                onChange={(e) => handleBrandInputChange(e.target.value)}
                placeholder="Ketik nama merek (kosong = otomatis Non Merek)..."
                style={{ paddingLeft: '2.75rem' }}
                className={`w-full h-9 pl-3 pr-14 text-xs font-semibold rounded-lg border transition-colors focus:outline-none ${
                  isDark
                    ? 'bg-[#1A1A1A] border-blue-500 text-white focus:ring-1 focus:ring-blue-500'
                    : 'bg-white border-blue-600 text-slate-900 focus:ring-1 focus:ring-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomBrandMode(false);
                  setBrand(firstAvailableBrandForCurrentComponent());
                }}
                className="absolute right-2 text-[10px] font-mono text-rose-500 hover:underline cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            /* DROPDOWN SELECT MEREK (BERLAKU UNTUK INPUT BARU MAUPUN MATERIAL EKSISTING) */
            <div className="relative flex items-center">
              <Tag className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
              <select
                disabled={!hasActiveFormIdentity}
                value={availableBrandsForCurrentComponent.includes(brand.trim() || 'Non Merek') ? (brand.trim() || 'Non Merek') : firstAvailableBrandForCurrentComponent()}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsCustomBrandMode(true);
                    setBrand('');
                    setTimeout(() => brandInputRef.current?.focus(), 50);
                  } else {
                    handleSelectBrand(e.target.value);
                  }
                }}
                style={{ paddingLeft: '2.75rem' }}
                className={`w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border transition-colors appearance-none ${
                  !hasActiveFormIdentity
                    ? isDark
                      ? 'bg-[#141414] border-white/5 text-slate-500 cursor-not-allowed opacity-60'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                    : isDark
                      ? 'bg-[#1A1A1A] border-[#333333] text-white cursor-pointer focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 cursor-pointer focus:border-blue-600'
                }`}
              >
                {!hasActiveFormIdentity ? (
                  <option value="">(isi nama material terlebih dahulu)</option>
                ) : (
                  <>
                    {availableBrandsForCurrentComponent.map((b) => (
                      <option key={b} value={b} className={isDark ? 'bg-[#202020] text-white' : 'bg-white text-slate-900'}>
                        {b === 'Non Merek' ? 'Non Merek (Standar)' : b}
                      </option>
                    ))}
                    <option value="__add_new__" className={isDark ? 'bg-[#202020] text-blue-400 font-bold' : 'bg-white text-blue-600 font-bold'}>
                      + Tambah Merek Baru...
                    </option>
                  </>
                )}
              </select>

              <div className="absolute right-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>

        {/* 3. SATUAN & SUMBER */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
              Satuan *
            </label>

            <div className="relative flex items-center">
              <select
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`w-full h-9 pl-3 pr-8 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none transition-colors appearance-none ${
                  isDark
                    ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
              >
                {unit && !units.some(u => u.name.toLowerCase() === unit.toLowerCase()) && (
                  <option value={unit} className={isDark ? 'bg-[#202020] text-white' : 'bg-white text-slate-900'}>
                    {unit}
                  </option>
                )}
                {units.map((u) => (
                  <option key={u.id} value={u.name} className={isDark ? 'bg-[#202020] text-white' : 'bg-white text-slate-900'}>
                    {u.name}
                  </option>
                ))}
              </select>

              <div className="absolute right-2.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
              Sumber Harga
            </label>
            <div className="relative flex items-center">
              <FileText className="w-3.5 h-3.5 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Contoh: Vendor/Distributor"
                style={{ paddingLeft: '2.75rem' }}
                className={`w-full h-9 px-3 text-xs rounded-lg border focus:outline-none ${
                  isDark ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
              />
            </div>
          </div>
        </div>
        </section>

        {/* 4. DAFTAR SEMUA DAERAH DAN BOX INPUT HARGA */}
        {!hasActiveFormIdentity ? (
          <div className={`rounded-xl border p-5 text-center transition-colors ${
            isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
            }`}>
              <Search className="w-5 h-5 opacity-75" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Belum Ada Pencarian
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[320px] mx-auto leading-relaxed">
              Pilih atau ketik nama material, jasa, atau alat terlebih dahulu untuk menampilkan input harga daerah.
            </p>
          </div>
        ) : (
          <section className={`rounded-xl border p-3.5 space-y-3.5 ${
            isDark ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            {/* Header section daftar daerah */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Harga Daerah
                </span>
                {filledPricesCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    {filledPricesCount}/{regions.length} Terisi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFirstPriceToAll}
                  className="h-7 px-2 rounded border border-blue-200 dark:border-blue-900/50 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer flex items-center gap-1"
                  title="Salin nominal harga pertama yang diisi ke seluruh daerah"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin</span>
                </button>

                {filledPricesCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllPrices}
                    className="h-7 px-2 rounded border border-rose-200 dark:border-rose-900/50 text-[10px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    title="Hapus semua isian harga"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
            </div>

            {/* List Jabaran Daerah dengan box input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {regions.map((reg, idx) => {
                const currentPriceVal = regionalPricesMap[reg.id] || '';
                const hasVal = Boolean(currentPriceVal && currentPriceVal.trim() !== '');

                return (
                  <div
                    key={reg.id}
                    className={`p-2 rounded-lg border transition-colors ${
                      hasVal
                        ? isDark
                          ? 'bg-[#222222] border-blue-500/40'
                          : 'bg-white border-blue-300 shadow-2xs'
                        : isDark
                          ? 'bg-[#161616] border-white/5 hover:border-white/10'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Nomor & Nama Daerah */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 truncate min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                          hasVal ? 'bg-blue-600 text-white' : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className={`text-xs truncate ${
                          hasVal
                            ? 'font-semibold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-700 dark:text-slate-300'
                        }`}>
                          {reg.name}
                        </span>
                      </div>
                      {reg.code && (
                        <span className="text-[10px] text-slate-400 shrink-0">{reg.code}</span>
                      )}
                    </div>

                    {/* Input Box Harga Daerah */}
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentPriceVal}
                        onChange={(e) => handlePriceChange(reg.id, e.target.value)}
                        placeholder="0"
                        className={`w-full h-9 pl-9 pr-3 text-xs font-bold text-right rounded-lg border focus:outline-none transition-colors ${
                          hasVal
                            ? isDark
                              ? 'bg-[#1A1A1A] border-blue-500 text-blue-400 focus:ring-1 focus:ring-blue-500'
                              : 'bg-white border-blue-500 text-blue-700 focus:ring-1 focus:ring-blue-500'
                            : isDark
                              ? 'bg-[#1A1A1A] border-[#333333] text-white focus:border-blue-500'
                              : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            } ${
              selectedComponentId
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSubmitting ? (
              <span>{selectedComponentId ? 'MEMPERBARUI...' : 'MENYIMPAN...'}</span>
            ) : selectedComponentId ? (
              <>
                <Edit3 className="w-4 h-4" />
                <span>PERBARUI VARIAN</span>
              </>
            ) : parentComponentForVariant ? (
              <>
                <Save className="w-4 h-4" />
                <span>SIMPAN MEREK</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SIMPAN KOMPONEN</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleCancelForm}
            className="h-9 px-4 rounded-lg border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold cursor-pointer transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

