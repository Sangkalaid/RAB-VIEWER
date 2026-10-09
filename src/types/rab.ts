export type ComponentType = 'bahan' | 'tenaga' | 'alat';

export type SourceType = 'RESMI' | 'SEKUNDER' | 'PASAR' | 'MANUAL';

export interface Region {
  id: string;
  name: string;
  code?: string;
  is_default?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface UnitItem {
  id: string;
  name: string;
  description?: string;
}

export interface ComponentItem {
  id: string;
  componentCode?: string;
  variantId?: string;
  variantName?: string;
  name: string;
  normalized_name: string;
  type: ComponentType;
  unit: string;
  specification?: string;
  brand?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistoryEntry {
  price: number;
  year: number;
  source: string;
  source_type: SourceType;
  updated_at: string;
}

export interface RegionalPrice {
  id: string;
  component_id: string;
  componentCode?: string;
  variantId?: string;
  region_id: string;
  price: number;
  year: number;
  source: string;
  source_type: SourceType;
  notes?: string;
  updated_at: string;
  history?: PriceHistoryEntry[];
}

export interface AHSPComponentRef {
  component_id: string;
  componentCode?: string;
  variantId?: string;
  coefficient: number;
  component_type: ComponentType;
}

export interface AHSPItem {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  unit_status?: 'AHSP_UNIT_FROM_TOTAL' | 'AHSP_UNIT_NOT_FOUND' | 'AHSP_UNIT_MISSING' | 'AHSP_MULTIPLE_TOTAL_ROWS';
  code?: string;
  reference: string;
  year: number;
  overhead_profit_pct: number; // e.g. 10
  components: AHSPComponentRef[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CalculatedComponentLine {
  component: ComponentItem;
  coefficient: number;
  unitPrice: number;
  totalPrice: number;
  hasPrice: boolean;
  source?: string;
  sourceType?: SourceType;
  year?: number;
}

export interface AHSPCalculationResult {
  ahsp: AHSPItem;
  region: Region;
  year: number;
  tenagaLines: CalculatedComponentLine[];
  bahanLines: CalculatedComponentLine[];
  alatLines: CalculatedComponentLine[];
  totalTenaga: number;
  totalBahan: number;
  totalAlat: number;
  subtotalDasar: number;
  overheadPct: number;
  overheadAmount: number;
  totalHargaSatuan: number;
  isComplete: boolean;
  missingComponents: string[];
  primarySourceType: SourceType;
  primaryReference: string;
}

export interface RabAppSettings {
  defaultRegionId: string;
  defaultYear: number;
  defaultOverheadPct: number;
  theme: 'light' | 'dark';
}

export interface RegionalComparisonEntry {
  region: Region;
  hasData: boolean;
  totalHargaSatuan: number;
  isComplete: boolean;
  primaryReference?: string;
  primarySourceType?: SourceType;
}
