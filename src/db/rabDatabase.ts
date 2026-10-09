import {
  Region,
  Category,
  UnitItem,
  ComponentItem,
  RegionalPrice,
  AHSPItem,
  AHSPCalculationResult,
  RabAppSettings,
  RegionalComparisonEntry,
  SourceType,
  CalculatedComponentLine
} from '../types/rab';

const STORAGE_KEY_FAVORITES = 'rab_checking_favorites_v2';
const STORAGE_KEY_HISTORY = 'rab_checking_history_v2';
const STORAGE_KEY_SETTINGS = 'rab_checking_settings_v2';
const MRV_API_URL = (import.meta.env.VITE_MRV_API_URL || '').replace(/\/$/, '');

export const MASTER_REGIONS: Region[] = [
  { id: 'reg_banjarmasin', name: 'Banjarmasin', code: 'BJM' },
  { id: 'reg_jakarta', name: 'Jakarta', code: 'JKT' },
  { id: 'reg_malang', name: 'Malang', code: 'MLG' },
  { id: 'reg_palembang', name: 'Palembang', code: 'PLB' },
  { id: 'reg_semarang', name: 'Semarang', code: 'SMG' },
  { id: 'reg_solo', name: 'Solo / Surakarta', code: 'SLO' },
  { id: 'reg_surabaya', name: 'Surabaya', code: 'SBY' },
  { id: 'reg_yogyakarta', name: 'Yogyakarta', code: 'DIY', is_default: true }
];

export const MASTER_CATEGORIES: Category[] = [
  { id: 'cat_arsitektural', name: 'Arsitektural' },
  { id: 'cat_struktur', name: 'Struktur' },
  { id: 'cat_elektrikal', name: 'Elektrikal' },
  { id: 'cat_mekanikal', name: 'Mekanikal' },
  { id: 'cat_landscape', name: 'Landscape' }
];

export const MASTER_UNITS: UnitItem[] = [
  { id: 'unt_m2', name: 'm²', description: 'Meter Persegi' },
  { id: 'unt_m3', name: 'm³', description: 'Meter Kubik' },
  { id: 'unt_m', name: 'm', description: 'Meter Panjang' },
  { id: 'unt_kg', name: 'kg', description: 'Kilogram' },
  { id: 'unt_oh', name: 'OH', description: 'Orang Hari (Upah)' },
  { id: 'unt_titik', name: 'titik', description: 'Titik Instalasi' },
  { id: 'unt_buah', name: 'buah', description: 'Buah / Pcs' },
  { id: 'unt_unit', name: 'unit', description: 'Unit Barang' },
  { id: 'unt_ls', name: 'Lump Sum' },
  { id: 'unt_zak', name: 'zak', description: 'Zak Semen' },
  { id: 'unt_btg', name: 'btg', description: 'Batang' },
  { id: 'unt_lbr', name: 'lbr', description: 'Lembar' },
  { id: 'unt_hari', name: 'hari', description: 'Hari (Sewa Alat)' },
  { id: 'unt_jam', name: 'jam', description: 'Jam (Alat Berat)' },
  { id: 'unt_liter', name: 'liter', description: 'Liter' },
  { id: 'unt_tube', name: 'tube', description: 'Tube / Sealant' },
  { id: 'unt_set', name: 'set', description: 'Set' },
  { id: 'unt_roll', name: 'roll', description: 'Roll' }
];

export const DEFAULT_RAB_SETTINGS: RabAppSettings = {
  defaultRegionId: 'reg_yogyakarta',
  defaultYear: 2026,
  defaultOverheadPct: 10,
  theme: 'light'
};

function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface RawRabDatabase {
  components: ComponentItem[];
  componentMasters?: ComponentMasterRecord[];
  componentVariants?: ComponentVariantRecord[];
  regionalPrices: RegionalPrice[];
  ahsps: AHSPItem[];
  categories: Category[];
  regions: Region[];
  units?: UnitItem[];
}

interface ComponentMasterRecord {
  componentCode: string;
  componentType: ComponentItem['type'];
  componentName: string;
  specification?: string;
  unit: string;
  status?: string;
}

interface ComponentVariantRecord {
  variantId: string;
  componentCode: string;
  variantName: string;
  brand?: string;
  specification?: string;
  unit: string;
  priceSource?: string;
  updatedAt?: string;
}

interface MrvApiEnvelope {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: RawRabDatabase;
}

export interface MrvHargaRecord {
  type: ComponentItem['type'];
  componentCode?: string;
  variantId?: string;
  name: string;
  specification?: string;
  brand?: string;
  unit: string;
  prices: Record<string, number>;
  year: number;
  source: string;
  original?: {
    type: ComponentItem['type'];
    componentCode?: string;
    variantId?: string;
    name: string;
    specification?: string;
    brand?: string;
    unit: string;
    year: number;
  };
}

export interface MrvAhspRecord {
  code: string;
  category: string;
  subcategory?: string;
  name: string;
  unit: string;
  reference: string;
  year: number;
  components: Array<{
    type: ComponentItem['type'];
    componentCode?: string;
    variantId?: string;
    name: string;
    unit: string;
    coefficient: number;
    prices?: Record<string, number>;
  }>;
}

function normalizeText(input: string): string {
  return input.normalize('NFKD').toLowerCase().trim().replace(/\s+/g, ' ');
}

function searchVariants(input: string): string[] {
  const base = normalizeText(input);
  return Array.from(new Set([
    base,
    base.replace(/\bplafon\b/g, 'plafond'),
    base.replace(/\bplafond\b/g, 'plafon'),
    base.replace(/\bplumbing\b/g, 'plambing'),
    base.replace(/\bplambing\b/g, 'plumbing'),
    base.replace(/\baluminium\b/g, 'alumunium'),
    base.replace(/\balumunium\b/g, 'aluminium')
  ].filter(Boolean)));
}

function sameText(a = '', b = ''): boolean {
  return normalizeText(a) === normalizeText(b);
}

function normalizeUnitText(input = ''): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/\s+/g, '')
    .trim();
}

function sameUnit(a = '', b = ''): boolean {
  return normalizeUnitText(a) === normalizeUnitText(b);
}

function componentNameTokens(input = ''): string[] {
  const ignored = new Set([
    'dan', 'atau', 'untuk', 'dengan', 'yang', 'ke', 'di', 'dari',
    'mm', 'cm', 'm', 'kg', 'gr', 'liter', 'buah', 'lembar', 'batang',
    'x', 'tebal', 'ukuran'
  ]);
  return normalizeText(input)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !ignored.has(token));
}

function componentNamesLikelyRelated(a = '', b = ''): boolean {
  const left = componentNameTokens(a);
  const right = new Set(componentNameTokens(b));
  if (left.length === 0 || right.size === 0) return false;
  return left.some((token) => right.has(token));
}

function normalizeUnits(units: UnitItem[]): UnitItem[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  return units
    .filter((unit) => unit.name?.trim())
    .map((unit) => {
      const name = unit.name.trim();
      let id = unit.id?.trim() || `unt_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      while (seenIds.has(id)) id = `${id}_${seenIds.size + 1}`;
      seenIds.add(id);
      return { ...unit, id, name };
    })
    .filter((unit) => {
      const key = unit.name.toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
}

function blockedWrite(): never {
  throw new Error('Database lokal legacy sudah dinonaktifkan. Perubahan operasional harus ditulis ke MRV melalui endpoint /exec.');
}

function sourcePriority(sourceType?: SourceType): number {
  if (sourceType === 'RESMI') return 4;
  if (sourceType === 'SEKUNDER') return 3;
  if (sourceType === 'PASAR') return 2;
  if (sourceType === 'MANUAL') return 1;
  return 0;
}

export class RabDatabaseService {
  private components: ComponentItem[] = [];
  private regionalPrices: RegionalPrice[] = [];
  private ahsps: AHSPItem[] = [];
  private categories: Category[] = MASTER_CATEGORIES;
  private regions: Region[] = MASTER_REGIONS;
  private units: UnitItem[] = MASTER_UNITS;
  private favorites: string[] = [];
  private searchHistory: string[] = [];
  private settings: RabAppSettings = DEFAULT_RAB_SETTINGS;

  public readonly apiUrl = MRV_API_URL;
  public readonly apiConfigured = Boolean(MRV_API_URL);

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (rawSettings) this.settings = { ...DEFAULT_RAB_SETTINGS, ...JSON.parse(rawSettings) };
    } catch {
      this.settings = DEFAULT_RAB_SETTINGS;
    }
    try {
      const rawFavs = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (rawFavs) this.favorites = JSON.parse(rawFavs);
    } catch {
      this.favorites = [];
    }
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (rawHistory) this.searchHistory = JSON.parse(rawHistory);
    } catch {
      this.searchHistory = [];
    }
  }

  private savePreferences() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(this.favorites));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.searchHistory));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
  }

  private async postToMRV(action: string, payload: Record<string, unknown>): Promise<unknown> {
    if (!MRV_API_URL) throw new Error('Endpoint MRV belum dikonfigurasi.');
    const form = new URLSearchParams();
    const requestId = typeof payload.request_id === 'string'
      ? payload.request_id
      : `${action}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    form.set('action', action);
    form.set('request_id', requestId);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && key !== 'request_id') form.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);
    try {
      const res = await fetch(MRV_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: form.toString(),
        signal: controller.signal
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || json?.error || `MRV write gagal (${res.status})`);
      }
      return json;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('MRV write timeout. Data belum dianggap tersimpan; silakan Refresh sebelum mencoba ulang.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  public async loadFromMRV(signal?: AbortSignal): Promise<void> {
    if (!MRV_API_URL) throw new Error('Endpoint MRV belum dikonfigurasi.');
    const url = `${MRV_API_URL}${MRV_API_URL.includes('?') ? '&' : '?'}resource=data`;
    const res = await fetch(url, { method: 'GET', signal });
    const envelope: MrvApiEnvelope | RawRabDatabase = await res.json();
    if (signal?.aborted) return;
    if (!res.ok) throw new Error(`MRV read gagal (${res.status})`);
    if ('ok' in envelope && envelope.ok === false) throw new Error(envelope.error || 'MRV read gagal.');
    const data = 'data' in envelope && envelope.data ? envelope.data : envelope as RawRabDatabase;
    if (!Array.isArray(data.components) || !Array.isArray(data.regionalPrices) || !Array.isArray(data.ahsps)) {
      throw new Error('Payload MRV tidak sesuai skema RAB VIEWER.');
    }
    this.components = data.components;
    this.regionalPrices = data.regionalPrices;
    this.ahsps = data.ahsps
      .filter((ahsp) => !/TOTAL\s+PEKERJAAN/i.test(ahsp.name || ''))
      .map((ahsp) => {
        const unitStatus = ahsp.unit_status || 'AHSP_UNIT_NOT_FOUND';
        return {
          ...ahsp,
          unit_status: unitStatus,
          unit: unitStatus === 'AHSP_UNIT_FROM_TOTAL' ? ahsp.unit : ''
        };
      });
    if (data.componentVariants?.length) {
      const variantById = new Map(data.componentVariants.map((variant) => [variant.variantId, variant]));
      this.components = this.components.map((component) => {
        const variant = component.variantId ? variantById.get(component.variantId) : undefined;
        return variant ? {
          ...component,
          id: variant.variantId,
          variantId: variant.variantId,
          componentCode: variant.componentCode,
          variantName: variant.variantName
        } : component;
      });
      this.regionalPrices = this.regionalPrices.map((price) => {
        const variant = price.variantId ? variantById.get(price.variantId) : undefined;
        return variant ? {
          ...price,
          component_id: variant.variantId,
          variantId: variant.variantId,
          componentCode: variant.componentCode
        } : price;
      });
    }
    this.categories = data.categories?.length ? data.categories : MASTER_CATEGORIES;
    this.regions = data.regions?.length ? data.regions : MASTER_REGIONS;
    this.units = normalizeUnits(data.units?.length ? data.units : MASTER_UNITS);
  }

  public async saveHargaToMRV(record: MrvHargaRecord, isUpdate: boolean): Promise<void> {
    await this.postToMRV(isUpdate ? 'update_harga' : 'create_harga', { record });
  }

  public async saveAHSPToMRV(record: MrvAhspRecord, isUpdate: boolean): Promise<void> {
    const cleanRecord: MrvAhspRecord = {
      ...record,
      components: record.components
        .filter((component) => !/TOTAL\s+PEKERJAAN/i.test(component.name))
        .filter((component) => ['tenaga', 'bahan', 'alat'].includes(component.type))
        .map(({ type, componentCode, variantId, name, unit, coefficient, prices }) => ({ type, componentCode, variantId, name, unit, coefficient, prices }))
    };
    await this.postToMRV(isUpdate ? 'update_ahsp' : 'create_ahsp', { record: cleanRecord });
  }

  public getUnits(): UnitItem[] { return [...this.units]; }
  public getRegions(): Region[] { return [...this.regions]; }
  public getCategories(): Category[] { return [...this.categories]; }
  public getSettings(): RabAppSettings { return { ...this.settings }; }
  public getComponents(type?: 'bahan' | 'tenaga' | 'alat'): ComponentItem[] {
    return this.components.filter((component) => !type || component.type === type);
  }
  public getRegionalPrices(): RegionalPrice[] { return [...this.regionalPrices]; }
  public getAHSPEntries(): AHSPItem[] { return [...this.ahsps]; }
  public getAHSPs(): AHSPItem[] { return this.getAHSPEntries(); }
  public getFavorites(): string[] { return [...this.favorites]; }
  public getSearchHistory(): string[] { return [...this.searchHistory]; }

  public updateSettings(partial: Partial<RabAppSettings>): RabAppSettings {
    this.settings = { ...this.settings, ...partial };
    this.savePreferences();
    return this.getSettings();
  }

  public addSearchHistory(query: string) {
    const q = query.trim();
    if (!q) return;
    this.searchHistory = [q, ...this.searchHistory.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 20);
    this.savePreferences();
  }

  public clearSearchHistory() {
    this.searchHistory = [];
    this.savePreferences();
  }

  public toggleFavorite(ahspId: string): boolean {
    const exists = this.favorites.includes(ahspId);
    this.favorites = exists ? this.favorites.filter((id) => id !== ahspId) : [...this.favorites, ahspId];
    this.savePreferences();
    return !exists;
  }

  public isFavorite(ahspId: string): boolean {
    return this.favorites.includes(ahspId);
  }

  public getRegionById(id: string): Region {
    return this.regions.find((region) => region.id === id) || this.regions.find((region) => region.is_default) || MASTER_REGIONS[7];
  }

  public getComponentById(id: string): ComponentItem | undefined {
    return this.components.find((component) => component.id === id);
  }

  public findComponentByNameAndSpec(name: string, specification?: string, type?: ComponentItem['type']): ComponentItem | undefined {
    return this.components.find((component) => {
      if (type && component.type !== type) return false;
      if (!sameText(component.name, name)) return false;
      return sameText(component.specification || '', specification || '');
    });
  }

  public findComponentByNameAndBrand(name: string, brand?: string, type?: ComponentItem['type']): ComponentItem | undefined {
    const wantedBrand = brand?.trim() || 'Non Merek';
    return this.components.find((component) => {
      if (type && component.type !== type) return false;
      if (!sameText(component.name, name)) return false;
      return sameText(component.brand || 'Non Merek', wantedBrand);
    });
  }

  private getCanonicalPriceForComponent(component: ComponentItem, regionId: string, year: number): RegionalPrice | undefined {
    const findPrice = (candidateComponentId: string) => {
      const available = this.regionalPrices.filter((price) => (
        price.component_id === candidateComponentId
        && price.region_id === regionId
        && Number.isFinite(price.price)
        && price.price > 0
      ));
      return available.find((price) => price.year === year)
        || available
        .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))[0]
    };
    const directPrice = findPrice(component.id);
    if (directPrice) return directPrice;

    const levels = [
      (candidate: ComponentItem) => Boolean(component.componentCode) && candidate.componentCode === component.componentCode && Boolean(component.variantId) && candidate.variantId === component.variantId,
      (candidate: ComponentItem) => Boolean(component.componentCode) && candidate.componentCode === component.componentCode && sameText(candidate.brand || '', component.brand || ''),
      (candidate: ComponentItem) => sameText(candidate.name, component.name) && sameText(candidate.unit, component.unit) && sameText(candidate.specification || '', component.specification || ''),
      (candidate: ComponentItem) => sameText(candidate.name, component.name) && sameText(candidate.unit, component.unit) && sameText(candidate.brand || '', component.brand || ''),
      (candidate: ComponentItem) => sameText(candidate.name, component.name) && sameText(candidate.unit, component.unit),
      (candidate: ComponentItem) => sameText(candidate.name, component.name)
    ];

    for (const level of levels) {
      const candidates = this.components
        .filter((candidate) => candidate.id !== component.id)
        .filter((candidate) => candidate.type === component.type)
        .filter(level)
        .filter((candidate) => Boolean(findPrice(candidate.id)));
      const uniqueIds = Array.from(new Set(candidates.map((candidate) => candidate.id)));
      if (uniqueIds.length === 1) return findPrice(uniqueIds[0]);
      if (uniqueIds.length > 1) return undefined;
    }
    return undefined;
  }

  private getDirectPriceForComponent(componentId: string, regionId: string, year: number): RegionalPrice | undefined {
    const available = this.regionalPrices.filter((price) => (
      price.component_id === componentId
      && price.region_id === regionId
      && Number.isFinite(price.price)
      && price.price > 0
    ));
    return available.find((price) => price.year === year)
      || available
        .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))[0];
  }

  public getPriceForComponent(componentId: string, regionId: string, year = this.settings.defaultYear): RegionalPrice | undefined {
    const component = this.getComponentById(componentId);
    if (!component) return undefined;
    return this.getCanonicalPriceForComponent(component, regionId, year);
  }

  public getBrandAlternativesForComponent(componentId: string, regionId?: string, year = this.settings.defaultYear): ComponentItem[] {
    const base = this.getComponentById(componentId);
    if (!base || base.type !== 'bahan') return [];
    const seen = new Set<string>();
    const hasUsablePrice = (component: ComponentItem) => {
      if (!regionId) return true;
      return Boolean(this.getDirectPriceForComponent(component.id, regionId, year));
    };
    const strictAlternatives = this.components
      .filter((component) => component.type === base.type)
      .filter((component) => base.componentCode ? component.componentCode === base.componentCode : sameText(component.name, base.name))
      .filter((component) => base.componentCode ? true : sameUnit(component.unit, base.unit))
      .filter(hasUsablePrice);
    const relaxedAlternatives = base.componentCode ? [] : this.components
      .filter((component) => component.type === base.type)
      .filter((component) => componentNamesLikelyRelated(component.name, base.name))
      .filter(hasUsablePrice);
    const alternatives = [...strictAlternatives, ...relaxedAlternatives]
      .filter((component) => {
        const key = base.componentCode
          ? (component.variantId || component.id)
          : (component.brand?.trim() || 'Non Merek').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.brand || 'Non Merek').localeCompare(b.brand || 'Non Merek'));
    const hasNamedBrand = alternatives.some((component) => component.brand?.trim());
    return hasNamedBrand ? alternatives.filter((component) => component.brand?.trim()) : alternatives;
  }

  public getAHSPById(id: string): AHSPItem | undefined {
    return this.ahsps.find((ahsp) => ahsp.id === id);
  }

  public getCategoryCodePrefix(categoryId: string): string {
    const category = this.categories.find((cat) => cat.id === categoryId);
    const name = category?.name.toUpperCase() || '';
    if (name.includes('STRUKTUR')) return 'S';
    if (name.includes('ELEKTRIKAL')) return 'E';
    if (name.includes('MEKANIKAL')) return 'M';
    if (name.includes('LANDSCAPE')) return 'L';
    return 'A';
  }

  public getNextAhspCode(categoryId: string): string {
    const prefix = this.getCategoryCodePrefix(categoryId);
    const max = this.ahsps
      .map((ahsp) => ahsp.code || '')
      .filter((code) => code.startsWith(`${prefix}.`))
      .map((code) => Number(code.split('.').pop()))
      .filter(Number.isFinite)
      .reduce((highest, current) => Math.max(highest, current), 0);
    return `${prefix}.${String(max + 1).padStart(3, '0')}`;
  }

  public searchAHSP(query: string, regionId: string, year: number, categoryId = 'ALL'): AHSPCalculationResult[] {
    return this.searchAHSPItems(query, categoryId)
      .map((ahsp) => this.calculateAHSP(ahsp.id, regionId, year))
      .filter((calc): calc is AHSPCalculationResult => Boolean(calc))
      .slice(0, 50);
  }

  public searchAHSPItems(query: string, categoryId = 'ALL'): AHSPItem[] {
    const variants = searchVariants(query);
    const primary = variants[0] || '';
    const tokens = primary.split(' ').filter(Boolean);
    const score = (ahsp: AHSPItem): number => {
      const name = normalizeText(ahsp.name || '');
      const code = normalizeText(ahsp.code || '');
      const category = normalizeText(this.categories.find((cat) => cat.id === ahsp.category_id)?.name || '');
      const subcategory = normalizeText(ahsp.notes || '');
      let best = 0;
      variants.forEach((q) => {
        const qTokens = q.split(' ').filter(Boolean);
        if (name === q) best = Math.max(best, 1000);
        if (name.startsWith(q)) best = Math.max(best, 900);
        if (name.includes(q)) best = Math.max(best, 800);
        if (qTokens.length && qTokens.every((token) => name.includes(token))) best = Math.max(best, 700);
        if (subcategory.includes(q)) best = Math.max(best, 520);
        if (category.includes(q)) best = Math.max(best, 500);
        if (code === q) best = Math.max(best, 450);
        if (code.includes(q)) best = Math.max(best, 420);
      });
      if (!best && tokens.length && tokens.every((token) => name.includes(token))) best = 650;
      return best;
    };
    return this.ahsps
      .filter((ahsp) => categoryId === 'ALL' || ahsp.category_id === categoryId)
      .map((ahsp) => ({ ahsp, score: score(ahsp) }))
      .filter((entry) => !primary || entry.score > 0)
      .sort((a, b) => b.score - a.score || (a.ahsp.name || '').localeCompare(b.ahsp.name || ''))
      .map((entry) => entry.ahsp)
      .slice(0, 50);
  }

  public getSearchSuggestions(query: string, limit = 7): string[] {
    const variants = searchVariants(query);
    const q = variants[0] || '';
    if (!q) return [];
    return this.ahsps
      .map((ahsp) => {
        const name = normalizeText(ahsp.name || '');
        const code = normalizeText(ahsp.code || '');
        const match = variants.some((variant) => name.includes(variant) || code.includes(variant));
        const score = variants.some((variant) => name.startsWith(variant)) ? 3 : variants.some((variant) => name.includes(variant)) ? 2 : variants.some((variant) => code.includes(variant)) ? 1 : 0;
        return { value: ahsp.name, match, score };
      })
      .filter((entry) => entry.match)
      .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value))
      .map((entry) => entry.value)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, limit);
  }

  public calculateAHSP(ahspId: string, regionId: string, year = this.settings.defaultYear, componentOverrides: Record<string, string> = {}): AHSPCalculationResult | null {
    const ahsp = this.getAHSPById(ahspId);
    if (!ahsp) return null;
    const region = this.getRegionById(regionId);
    const missingComponents: string[] = [];
    const lines: CalculatedComponentLine[] = ahsp.components
      .filter((ref) => ['tenaga', 'bahan', 'alat'].includes(ref.component_type))
      .map((ref) => {
        const component = this.getComponentById(ref.component_id);
        if (!component) {
          missingComponents.push(ref.component_id);
          const placeholder: ComponentItem = {
            id: ref.component_id,
            name: ref.component_id,
            normalized_name: ref.component_id,
            type: ref.component_type,
            unit: '',
            created_at: '',
            updated_at: ''
          };
          return { component: placeholder, coefficient: ref.coefficient, unitPrice: 0, totalPrice: 0, hasPrice: false };
        }
        const override = componentOverrides[component.id] ? this.getComponentById(componentOverrides[component.id]) : undefined;
        const pricedComponent = override && override.type === component.type ? override : component;
        const price = override ? this.getDirectPriceForComponent(pricedComponent.id, region.id, year) : this.getPriceForComponent(pricedComponent.id, region.id, year);
        if (!price) missingComponents.push(pricedComponent.name);
        return {
          component: pricedComponent,
          coefficient: ref.coefficient,
          unitPrice: price?.price || 0,
          totalPrice: (price?.price || 0) * ref.coefficient,
          hasPrice: Boolean(price),
          source: price?.source,
          sourceType: price?.source_type,
          year: price?.year
        };
      });
    const tenagaLines = lines.filter((line) => line.component.type === 'tenaga');
    const bahanLines = lines.filter((line) => line.component.type === 'bahan');
    const alatLines = lines.filter((line) => line.component.type === 'alat');
    const totalTenaga = tenagaLines.reduce((sum, line) => sum + line.totalPrice, 0);
    const totalBahan = bahanLines.reduce((sum, line) => sum + line.totalPrice, 0);
    const totalAlat = alatLines.reduce((sum, line) => sum + line.totalPrice, 0);
    const subtotalDasar = totalTenaga + totalBahan + totalAlat;
    const overheadPct = this.settings.defaultOverheadPct;
    const overheadAmount = subtotalDasar * (overheadPct / 100);
    const bestSource = lines.filter((line) => line.source).sort((a, b) => sourcePriority(b.sourceType) - sourcePriority(a.sourceType))[0];
    return {
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
      totalHargaSatuan: subtotalDasar + overheadAmount,
      isComplete: missingComponents.length === 0,
      missingComponents,
      primarySourceType: bestSource?.sourceType || 'MANUAL',
      // The reference belongs to the AHSP record. Component price source is
      // separate provenance and may contain a pipeline/list of collection methods.
      primaryReference: ahsp.reference
    };
  }

  public compareRegions(ahspId: string, year = this.settings.defaultYear): RegionalComparisonEntry[] {
    return this.regions.map((region) => {
      const calc = this.calculateAHSP(ahspId, region.id, year);
      return {
        region,
        hasData: Boolean(calc && calc.subtotalDasar > 0),
        totalHargaSatuan: calc?.totalHargaSatuan || 0,
        isComplete: Boolean(calc?.isComplete),
        primaryReference: calc?.primaryReference,
        primarySourceType: calc?.primarySourceType
      };
    });
  }

  public addUnit(name: string, description?: string): UnitItem {
    const unit = { id: generateId('unt'), name, description };
    this.units = [...this.units, unit];
    return unit;
  }
  public updateUnit(id: string, name: string, description?: string): UnitItem {
    const next = { id, name, description };
    this.units = this.units.map((unit) => unit.id === id ? next : unit);
    return next;
  }
  public deleteUnit(id: string): boolean {
    const before = this.units.length;
    this.units = this.units.filter((unit) => unit.id !== id);
    return this.units.length !== before;
  }
  public addRegion(name: string, code?: string): Region {
    const region = { id: generateId('reg'), name, code };
    this.regions = [...this.regions, region];
    return region;
  }
  public updateRegion(id: string, name: string, code?: string): Region {
    const next = { id, name, code };
    this.regions = this.regions.map((region) => region.id === id ? next : region);
    return next;
  }
  public deleteRegion(id: string): boolean {
    const before = this.regions.length;
    this.regions = this.regions.filter((region) => region.id !== id);
    return this.regions.length !== before;
  }

  public addComponent(_params?: Partial<ComponentItem>): ComponentItem { return blockedWrite(); }
  public updateComponent(_id?: string, _updates?: Partial<ComponentItem>): ComponentItem { return blockedWrite(); }
  public deleteComponent(_id?: string): boolean { return blockedWrite(); }
  public setRegionalPrice(_params?: Partial<RegionalPrice>): { price: RegionalPrice; isUpdate: boolean } { return blockedWrite(); }
  public deleteRegionalPrice(_id?: string): boolean { return blockedWrite(); }
  public addAHSP(_item?: Partial<AHSPItem>): AHSPItem { return blockedWrite(); }
  public updateAHSP(_id?: string, _updates?: Partial<AHSPItem>): AHSPItem { return blockedWrite(); }
  public duplicateAHSP(id?: string, customName?: string): AHSPItem {
    const source = id ? this.getAHSPById(id) : undefined;
    if (!source) throw new Error('AHSP sumber tidak ditemukan pada data MRV terbaru.');
    return {
      ...source,
      id: generateId('ahsp_draft'),
      name: customName?.trim() || `${source.name} (Salinan)`,
      code: this.getNextAhspCode(source.category_id),
      components: source.components.map((component) => ({ ...component })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  public deleteAHSP(_id?: string): boolean { return blockedWrite(); }

  public exportBackupJson(): string {
    return JSON.stringify({
      schema: 'rab-viewer-mrv-live',
      exported_at: new Date().toISOString(),
      source: 'MRV live endpoint',
      data: { components: this.components, regionalPrices: this.regionalPrices, ahsps: this.ahsps, categories: this.categories, regions: this.regions, units: this.units, settings: this.settings }
    }, null, 2);
  }
  public restoreFromJson(): { success: boolean; message: string } {
    return { success: false, message: 'Restore database lokal dinonaktifkan. Gunakan MRV sebagai sumber data.' };
  }
  public resetToDefault() {
    this.components = [];
    this.regionalPrices = [];
    this.ahsps = [];
    this.categories = MASTER_CATEGORIES;
    this.regions = MASTER_REGIONS;
    this.units = MASTER_UNITS;
    this.settings = DEFAULT_RAB_SETTINGS;
    this.savePreferences();
  }
}

export const rabDb = new RabDatabaseService();
