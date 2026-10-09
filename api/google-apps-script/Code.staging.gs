const SPREADSHEET_ID = '1zQj-rFSGyqe1VQtdqvNplxdRtrWeCfz9ra5dh_NANGw';
const PRODUCTION_SPREADSHEET_ID = '1zQj-rFSGyqe1VQtdqvNplxdRtrWeCfz9ra5dh_NANGw';
const EXECUTION_MODE = 'staging'; // production | staging | testing
const AHSP_SHEET = 'AHSP';
const PRICE_SHEET = 'HARGA BAHAN';
const MASTER_COMPONENT_SHEET = 'MASTER KOMPONEN';
const COUNTER_SHEET = 'SYSTEM COUNTERS';
const SHEET_PROFILES = {
  production: {
    ahsp: 'AHSP',
    price: 'HARGA BAHAN',
    master: 'MASTER KOMPONEN',
    counter: 'SYSTEM COUNTERS'
  },
  staging: {
    ahsp: 'AHSP (STAGING)',
    price: 'HARGA BAHAN (STAGING)',
    master: 'MASTER KOMPONEN (STAGING)',
    counter: 'SYSTEM COUNTERS (STAGING)'
  },
  testing: {
    ahsp: 'AHSP (STAGING)',
    price: 'HARGA BAHAN (STAGING)',
    master: 'MASTER KOMPONEN (STAGING)',
    counter: 'SYSTEM COUNTERS (STAGING)'
  }
};
const API_VERSION = 'rab-viewer-mrv-api-2026.10.08-r5';
const SCHEMA_VERSION = 'component-code-variant-v1';
const REQUIRED_HEADERS = {
  ahsp: ['KODE AHSP', 'KATEGORI PEKERJAAN', 'ITEM PEKERJAAN', 'JENIS KOMPONEN', 'KOMPONEN / URAIAN', 'SATUAN', 'KOEFISIEN', 'DASAR / REFERENSI', 'KODE KOMPONEN'],
  price: ['NO', 'JENIS KOMPONEN', 'NAMA KOMPONEN', 'SPESIFIKASI', 'MERK', 'SATUAN', 'KODE KOMPONEN', 'ID VARIAN', 'KETERANGAN SUMBER'],
  master: ['KODE KOMPONEN', 'JENIS KOMPONEN', 'NAMA KOMPONEN', 'SATUAN'],
  counter: ['KEY', 'VALUE']
};

const REGIONS = [
  { id: 'reg_banjarmasin', name: 'Banjarmasin', code: 'BJM', column: 'BANJARMASIN' },
  { id: 'reg_jakarta', name: 'Jakarta', code: 'JKT', column: 'JAKARTA' },
  { id: 'reg_malang', name: 'Malang', code: 'MLG', column: 'MALANG' },
  { id: 'reg_palembang', name: 'Palembang', code: 'PLB', column: 'PALEMBANG' },
  { id: 'reg_semarang', name: 'Semarang', code: 'SMG', column: 'SEMARANG' },
  { id: 'reg_solo', name: 'Solo', code: 'SLO', column: 'SOLO' },
  { id: 'reg_surabaya', name: 'Surabaya', code: 'SBY', column: 'SURABAYA' },
  { id: 'reg_yogyakarta', name: 'Yogyakarta', code: 'DIY', column: 'YOGYAKARTA', is_default: true }
];

const CATEGORIES = [
  { id: 'cat_arsitektural', name: 'ARSITEKTUR' },
  { id: 'cat_struktur', name: 'STRUKTUR' },
  { id: 'cat_elektrikal', name: 'ELEKTRIKAL' },
  { id: 'cat_mekanikal', name: 'MEKANIKAL' },
  { id: 'cat_landscape', name: 'LANDSCAPE' }
];

function doGet(e) {
  try {
    const resource = String((e.parameter && e.parameter.resource) || 'data').toLowerCase();
    if (resource === 'health') {
      return json_({ ok: true, apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, executionMode: runtimeMode_(), spreadsheetId: SPREADSHEET_ID, productionSpreadsheetId: PRODUCTION_SPREADSHEET_ID, runtimeSheets: runtimeSheetList_(), timestamp: new Date().toISOString() });
    }
    if (resource === 'setup_staging') return json_({ ok: true, apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, setup: ensureStagingRuntimeSheets_(), timestamp: new Date().toISOString() });
    if (resource === 'validate_schema') return json_({ ok: true, apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, validation: validateSchema_(), references: validateReferences_(), counters: validateCounters_(), timestamp: new Date().toISOString() });
    if (resource === 'verify_staging') return json_({ ok: true, apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, verification: verifyStagingReadWrite_(), timestamp: new Date().toISOString() });
    if (resource !== 'data') return json_({ ok: false, error: 'Unknown resource' }, 404);
    return json_({ ok: true, apiVersion: API_VERSION, schemaVersion: SCHEMA_VERSION, data: readMrv_() });
  } catch (err) {
    return json_({ ok: false, error: message_(err) }, 500);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let requestId = '';
  try {
    try { lock.waitLock(30000); } catch (err) { return apiFail_('WRITE_LOCK_TIMEOUT', 'Tidak dapat memperoleh lock penulisan MRV.', {}, 423); }
    const body = requestBody_(e);
    if (!body.action) return apiFail_('VALIDATION_ERROR', 'action is required', {}, 400);
    assertWritableTarget_();
    requestId = text_(body.request_id);
    if (requestId) {
      const cache = CacheService.getScriptCache();
      const existing = cache.get('idem:' + requestId);
      if (existing === 'done') return json_({ ok: true, code: 'IDEMPOTENT_REPLAY', data: readMrv_() });
      if (existing === 'started') return apiFail_('REQUEST_IN_PROGRESS', 'Permintaan dengan request_id ini masih diproses.', { request_id: requestId }, 409);
      cache.put('idem:' + requestId, 'started', 21600);
    }

    if (body.action === 'create_harga') createHarga_(body.record);
    else if (body.action === 'update_harga') updateHarga_(body.record);
    else if (body.action === 'create_ahsp') createAhsp_(body.record);
    else if (body.action === 'update_ahsp') updateAhsp_(body.record);
    else return apiFail_('VALIDATION_ERROR', 'Unsupported action', { action: body.action }, 400);

    SpreadsheetApp.flush();
    if (requestId) CacheService.getScriptCache().put('idem:' + requestId, 'done', 21600);
    return json_({ ok: true, data: readMrv_() });
  } catch (err) {
    if (requestId) {
      try { CacheService.getScriptCache().remove('idem:' + requestId); } catch (cacheErr) {}
    }
    return apiFail_(err.code || 'INTERNAL_ERROR', err.message || message_(err), err.details || {}, err.status || 500);
  } finally {
    try { lock.releaseLock(); } catch (err) {}
  }
}

function assertWritableTarget_() {
  const mode = text_(EXECUTION_MODE).toLowerCase();
  const sheets = runtimeSheets_();
  if ((mode === 'staging' || mode === 'testing') && (
    sheets.ahsp === AHSP_SHEET ||
    sheets.price === PRICE_SHEET ||
    sheets.master === MASTER_COMPONENT_SHEET ||
    sheets.counter === COUNTER_SHEET
  )) {
    throwApi_(
      'PRODUCTION_WRITE_BLOCKED',
      'Write ditolak: mode staging/testing masih menunjuk ke sheet produksi.',
      { executionMode: EXECUTION_MODE, spreadsheetId: SPREADSHEET_ID, runtimeSheets: runtimeSheetList_() },
      403
    );
  }
}

function runtimeMode_() {
  const mode = text_(EXECUTION_MODE).toLowerCase();
  return SHEET_PROFILES[mode] ? mode : 'production';
}

function runtimeSheets_() {
  return SHEET_PROFILES[runtimeMode_()];
}

function runtimeSheetList_() {
  const sheets = runtimeSheets_();
  return [sheets.ahsp, sheets.price, sheets.master, sheets.counter];
}

function getRuntimeSheet_(ss, key, required) {
  const sheetName = runtimeSheets_()[key];
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet && required !== false) throwApi_('RUNTIME_SHEET_MISSING', 'Sheet runtime tidak ditemukan: ' + sheetName, { executionMode: runtimeMode_(), sheet: sheetName }, 500);
  return sheet;
}

function ensureStagingRuntimeSheets_() {
  if (runtimeMode_() !== 'staging' && runtimeMode_() !== 'testing') {
    throwApi_('SETUP_NOT_ALLOWED', 'Setup staging hanya boleh dijalankan pada mode staging/testing.', { executionMode: runtimeMode_() }, 403);
  }
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const staging = SHEET_PROFILES.staging;
  const production = SHEET_PROFILES.production;
  const result = [];
  Object.keys(staging).forEach((key) => {
    const targetName = staging[key];
    const sourceName = production[key];
    const existing = ss.getSheetByName(targetName);
    if (existing) {
      const schemaStatus = ensureStagingSheetSchema_(ss, key, existing, sourceName);
      result.push({ sheet: targetName, status: schemaStatus });
      return;
    }
    const source = ss.getSheetByName(sourceName);
    if (!source) throwApi_('SOURCE_SHEET_MISSING', 'Sheet produksi sumber tidak ditemukan: ' + sourceName, { source: sourceName, target: targetName }, 500);
    const copy = source.copyTo(ss).setName(targetName);
    ss.setActiveSheet(copy);
    ss.moveActiveSheet(ss.getNumSheets());
    result.push({ sheet: targetName, status: 'created_from_' + sourceName });
  });
  return result;
}

function ensureStagingSheetSchema_(ss, key, target, sourceName) {
  const source = ss.getSheetByName(sourceName);
  if (!source) throwApi_('SOURCE_SHEET_MISSING', 'Sheet produksi sumber tidak ditemukan: ' + sourceName, { source: sourceName, target: target.getName() }, 500);
  const targetHeaders = headers_(target).filter((header) => text_(header));
  const sourceHeaders = headers_(source).filter((header) => text_(header));
  if (targetHeaders.length) {
    ensureRequiredHeaders_(target, key);
    return 'exists_schema_checked';
  }
  if (!sourceHeaders.length) throwApi_('SOURCE_HEADERS_MISSING', 'Header sheet produksi sumber kosong: ' + sourceName, { source: sourceName, target: target.getName() }, 500);

  target.clear();
  target.getRange(1, 1, 1, sourceHeaders.length).setValues([sourceHeaders]);
  ensureRequiredHeaders_(target, key);

  // Master and counter are reference sheets required by staging writes, so copy
  // their current rows into the isolated staging sheets. AHSP/HARGA staging only
  // need schema headers for destructive tests and remain clean unless the user
  // already filled them manually.
  if (key === 'master' || key === 'counter') {
    const lastRow = source.getLastRow();
    if (lastRow > 1) {
      const values = source.getRange(2, 1, lastRow - 1, sourceHeaders.length).getValues();
      target.getRange(2, 1, values.length, sourceHeaders.length).setValues(values);
    }
    return 'schema_and_reference_rows_repaired_from_' + sourceName;
  }
  return 'schema_repaired_from_' + sourceName;
}

function ensureRequiredHeaders_(sheet, key) {
  const required = (REQUIRED_HEADERS[key] || []).concat((key === 'ahsp' || key === 'price') ? REGIONS.map((region) => region.column) : []);
  let headers = headers_(sheet).filter((header) => text_(header));
  required.forEach((requiredHeader) => {
    if (!headers.some((header) => canonicalHeader_(header) === canonicalHeader_(requiredHeader))) {
      sheet.getRange(1, headers.length + 1).setValue(requiredHeader);
      headers.push(requiredHeader);
    }
  });
  return headers_(sheet);
}

function validateSchema_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return Object.keys(runtimeSheets_()).map((key) => {
    const sheet = getRuntimeSheet_(ss, key);
    const actual = headers_(sheet).filter((header) => text_(header));
    const required = (REQUIRED_HEADERS[key] || []).concat((key === 'ahsp' || key === 'price') ? REGIONS.map((region) => region.column) : []);
    const missing = required.filter((header) => !actual.some((item) => canonicalHeader_(item) === canonicalHeader_(header)));
    return {
      key: key,
      sheet: sheet.getName(),
      ok: missing.length === 0,
      headerCount: actual.length,
      missing: missing
    };
  });
}

function validateReferences_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const masterRows = objects_(getRuntimeSheet_(ss, 'master', false) || emptyRuntimeSheet_());
  const priceRows = objects_(getRuntimeSheet_(ss, 'price', false) || emptyRuntimeSheet_());
  const masterCodes = {};
  masterRows.forEach((row) => {
    const code = text_(row['KODE KOMPONEN']);
    if (code) masterCodes[code] = true;
  });
  const missingMasterCodes = {};
  priceRows.forEach((row) => {
    const code = text_(row['KODE KOMPONEN']);
    if (code && !masterCodes[code]) missingMasterCodes[code] = true;
  });
  return {
    masterCount: Object.keys(masterCodes).length,
    priceRows: priceRows.filter((row) => text_(row['NAMA KOMPONEN'])).length,
    missingMasterCodes: Object.keys(missingMasterCodes)
  };
}

function validateCounters_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = objects_(getRuntimeSheet_(ss, 'counter', false) || emptyRuntimeSheet_());
  const counters = {};
  rows.forEach((row) => {
    const key = text_(field_(row, ['KEY', 'COUNTER', 'NAMA']));
    if (!key) return;
    counters[key] = number_(field_(row, ['VALUE', 'NILAI', 'LAST', 'LAST_NUMBER']));
  });
  return {
    ok: ['BHN', 'JS', 'ALT'].every((key) => counters[key] !== undefined),
    counters: counters,
    missing: ['BHN', 'JS', 'ALT'].filter((key) => counters[key] === undefined)
  };
}

function verifyStagingReadWrite_() {
  if (runtimeMode_() !== 'staging' && runtimeMode_() !== 'testing') {
    throwApi_('VERIFY_NOT_ALLOWED', 'verify_staging hanya boleh dijalankan pada mode staging/testing.', { executionMode: runtimeMode_() }, 403);
  }
  const schema = validateSchema_();
  const failed = schema.filter((item) => !item.ok);
  if (failed.length) throwApi_('SCHEMA_INVALID', 'Schema staging belum valid.', { failed: failed }, 500);
  const data = readMrv_();
  return {
    ok: true,
    components: data.components.length,
    componentMasters: data.componentMasters.length,
    componentVariants: data.componentVariants.length,
    regionalPrices: data.regionalPrices.length,
    ahsps: data.ahsps.length
  };
}

function requestBody_(e) {
  const params = (e && e.parameter) || {};
  if (params.action) {
    return {
      action: params.action,
      request_id: params.request_id,
      record: params.record ? JSON.parse(params.record) : undefined
    };
  }
  return JSON.parse((e.postData && e.postData.contents) || '{}');
}

function apiFail_(code, message, details, status) {
  return json_({ ok: false, code: code, message: message, error: message, details: details || {} }, status || 500);
}

function throwApi_(code, message, details, status) {
  const err = new Error(message);
  err.code = code;
  err.details = details || {};
  err.status = status || 400;
  throw err;
}

function readMrv_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const ahspRows = objects_(getRuntimeSheet_(ss, 'ahsp'));
  const priceRows = objects_(getRuntimeSheet_(ss, 'price'));
  const masterSheet = getRuntimeSheet_(ss, 'master', false);
  const masterRows = masterSheet ? objects_(masterSheet) : [];

  const components = {};
  const componentMasters = {};
  const componentVariants = {};
  const defaultVariantByCode = {};
  const ahsps = {};
  const ahspGroups = {};
  const units = {};
  const stats = {
    tenaga: 0, bahan: 0, alat: 0, total_pekerjaan: 0, invalid: 0,
    ahspUnitMissing: 0, ahspUnitMultipleTotals: 0, ahspUnitMissingTotalUnit: 0,
    ahspTotalItemMismatch: 0, ahspTotalCoefficientMismatch: 0, ahspReferenceMissing: 0
  };

  masterRows.forEach((row) => {
    const componentCode = text_(field_(row, ['KODE KOMPONEN', 'componentCode', 'COMPONENT CODE']));
    const type = normalizeType_(field_(row, ['JENIS KOMPONEN', 'TIPE', 'TYPE']));
    const name = text_(field_(row, ['NAMA KOMPONEN', 'NAMA', 'COMPONENT NAME']));
    if (!componentCode || !type || !name) return;
    const unit = text_(field_(row, ['SATUAN', 'UNIT'])) || 'unit';
    units[unit] = true;
    componentMasters[componentCode] = {
      componentCode,
      componentType: type,
      componentName: name,
      specification: text_(field_(row, ['SPESIFIKASI', 'SPECIFICATION'])),
      unit,
      status: text_(field_(row, ['STATUS'])) || 'ACTIVE'
    };
  });

  priceRows.forEach((row) => {
    const type = normalizeType_(row['JENIS KOMPONEN']);
    const name = text_(row['NAMA KOMPONEN']);
    if (!type || !name) return;
    const componentCode = text_(row['KODE KOMPONEN']) || '';
    const variantId = text_(row['ID VARIAN']) || componentId_(type, name, row['SPESIFIKASI'], row['MERK']);
    const id = variantId;
    const unit = text_(row['SATUAN']) || 'unit';
    units[unit] = true;
    if (componentCode && !componentMasters[componentCode]) {
      componentMasters[componentCode] = {
        componentCode,
        componentType: type,
        componentName: name,
        specification: text_(row['SPESIFIKASI']),
        unit,
        status: 'ACTIVE'
      };
    }
    if (componentCode && !defaultVariantByCode[componentCode]) defaultVariantByCode[componentCode] = variantId;
    componentVariants[variantId] = {
      variantId,
      componentCode,
      variantName: name,
      brand: text_(row['MERK']) || 'Non Merek',
      specification: text_(row['SPESIFIKASI']),
      unit,
      priceSource: text_(row['KETERANGAN SUMBER']),
      updatedAt: dateText_(row['TANGGAL UPDATE'])
    };
    components[id] = {
      id,
      componentCode,
      variantId,
      variantName: name,
      name,
      normalized_name: name.toLowerCase(),
      type,
      unit,
      specification: text_(row['SPESIFIKASI']),
      brand: text_(row['MERK']) || 'Non Merek',
      created_at: '',
      updated_at: dateText_(row['TANGGAL UPDATE'])
    };
  });

  // Group all AHSP rows before constructing the canonical job. The work unit
  // belongs to TOTAL PEKERJAAN; component SATUAN values (e.g. labor OH) are
  // retained only on their own component records.
  ahspRows.forEach((row) => {
    const code = text_(row['KODE AHSP']);
    const itemName = text_(row['ITEM PEKERJAAN']);
    if (!code || !itemName) {
      stats.invalid += 1;
      return;
    }
    if (!ahspGroups[code]) ahspGroups[code] = [];
    ahspGroups[code].push(row);
  });

  Object.keys(ahspGroups).forEach((code) => {
    const rows = ahspGroups[code];
    const summaries = rows.filter((row) => text_(row['JENIS KOMPONEN']).toUpperCase() === 'TOTAL PEKERJAAN');
    const detailRows = rows.filter((row) => Boolean(normalizeType_(row['JENIS KOMPONEN'])));
    const baseRow = detailRows[0] || summaries[0] || rows[0];
    const summary = summaries.length === 1 ? summaries[0] : null;
    const summaryUnit = summary ? text_(summary['SATUAN']) : '';
    const unitStatus = summaries.length > 1
      ? 'AHSP_MULTIPLE_TOTAL_ROWS'
      : !summary
        ? 'AHSP_UNIT_NOT_FOUND'
        : !summaryUnit
          ? 'AHSP_UNIT_MISSING'
          : 'AHSP_UNIT_FROM_TOTAL';
    if (unitStatus === 'AHSP_MULTIPLE_TOTAL_ROWS') stats.ahspUnitMultipleTotals += 1;
    if (unitStatus === 'AHSP_UNIT_NOT_FOUND') stats.ahspUnitMissing += 1;
    if (unitStatus === 'AHSP_UNIT_MISSING') stats.ahspUnitMissingTotalUnit += 1;
    if (summary && canonical_(summary['KOMPONEN / URAIAN']) !== canonical_(baseRow['ITEM PEKERJAAN'])) stats.ahspTotalItemMismatch += 1;
    if (summary && number_(summary['KOEFISIEN']) !== 1) stats.ahspTotalCoefficientMismatch += 1;
    const reference = text_((summary && summary['DASAR / REFERENSI']) || baseRow['DASAR / REFERENSI']);
    if (!reference) stats.ahspReferenceMissing += 1;
    const ahspId = ahspId_(code);
    const unit = unitStatus === 'AHSP_UNIT_FROM_TOTAL' ? summaryUnit : '';
    if (unit) units[unit] = true;
    ahsps[ahspId] = {
      id: ahspId,
      name: text_(baseRow['ITEM PEKERJAAN']),
      category_id: categoryId_(baseRow['KATEGORI PEKERJAAN']),
      unit,
      unit_status: unitStatus,
      code,
      reference,
      year: number_(baseRow['TAHUN']) || new Date().getFullYear(),
      overhead_profit_pct: 0,
      components: [],
      notes: text_(baseRow['SUBKATEGORI PEKERJAAN']),
      created_at: '',
      updated_at: dateText_(baseRow['TANGGAL UPDATE'])
    };

    stats.total_pekerjaan += summaries.length;
    rows.forEach((row) => {
      const rawType = text_(row['JENIS KOMPONEN']);
      const type = normalizeType_(rawType);
      if (!type) {
        if (rawType.toUpperCase() !== 'TOTAL PEKERJAAN') stats.invalid += 1;
        return;
      }
      const componentName = text_(row['KOMPONEN / URAIAN']);
      if (!componentName) {
        stats.invalid += 1;
        return;
      }
      stats[type] += 1;
      const componentCode = text_(row['KODE KOMPONEN']) || '';
      const componentId = componentCode && defaultVariantByCode[componentCode]
        ? defaultVariantByCode[componentCode]
        : componentId_(type, componentName, '', '');
      const componentUnit = text_(row['SATUAN']) || 'unit';
      units[componentUnit] = true;
      if (!components[componentId]) {
        components[componentId] = {
          id: componentId,
          componentCode,
          variantId: componentCode ? componentId : '',
          name: componentName,
          normalized_name: componentName.toLowerCase(),
          type,
          unit: componentUnit,
          specification: '',
          brand: '',
          created_at: '',
          updated_at: dateText_(row['TANGGAL UPDATE'])
        };
      }
      ahsps[ahspId].components.push({
        component_id: componentId,
        componentCode,
        variantId: componentCode ? componentId : '',
        coefficient: number_(row['KOEFISIEN']),
        component_type: type
      });
    });
  });

  const regionalPrices = [];
  priceRows.forEach((row) => {
    const type = normalizeType_(row['JENIS KOMPONEN']);
    const name = text_(row['NAMA KOMPONEN']);
    if (!type || !name) return;
    const componentCode = text_(row['KODE KOMPONEN']) || '';
    const variantId = text_(row['ID VARIAN']) || componentId_(type, name, row['SPESIFIKASI'], row['MERK']);
    const componentId = variantId;
    REGIONS.forEach((region) => {
      const classCode = text_(row['KLASIFIKASI ' + region.column]);
      regionalPrices.push({
        id: ['mrv-price', componentId, region.id, number_(row['TAHUN']) || new Date().getFullYear()].join('-'),
        component_id: componentId,
        componentCode,
        variantId,
        region_id: region.id,
        price: number_(row[region.column]),
        year: number_(row['TAHUN']) || new Date().getFullYear(),
        source: sourceLabel_(classCode),
        source_type: sourceType_(classCode),
        notes: text_(row['KETERANGAN SUMBER']),
        updated_at: dateText_(row['TANGGAL UPDATE']),
        history: []
      });
    });
  });

  return {
    apiVersion: API_VERSION,
    schemaVersion: SCHEMA_VERSION,
    components: Object.values(components),
    componentMasters: Object.values(componentMasters),
    componentVariants: Object.values(componentVariants),
    regionalPrices,
    ahsps: Object.values(ahsps),
    categories: CATEGORIES,
    regions: REGIONS.map(({ column, ...region }) => region),
    units: Object.keys(units).sort().map((name) => ({ id: 'unt_' + slug_(name), name })),
    stats: {
      ahspUnique: Object.keys(ahsps).length,
      ahspDetails: stats,
      hargaBahan: priceRows.filter((row) => text_(row['NAMA KOMPONEN'])).length
    }
  };
}

function createHarga_(record) {
  validateHarga_(record);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getRuntimeSheet_(ss, 'price');
  const rows = objects_(sheet);
  if (!text_(record.componentCode)) record.componentCode = allocateComponentCode_(ss, normalizeType_(record.type));
  if (!text_(record.variantId)) record.variantId = allocateVariantId_(rows, record.componentCode);
  const key = hargaKey_(record);
  if (rows.some((row) => hargaKey_(row) === key)) throwApi_('DUPLICATE_HARGA', 'HARGA BAHAN dengan identitas yang sama sudah ada.', { key: key }, 409);
  const duplicateVariantKey = variantDuplicateKey_(record);
  if (rows.some((row) => variantDuplicateKey_(row) === duplicateVariantKey)) throwApi_('DUPLICATE_VARIANT', 'Varian dengan merek, spesifikasi, dan satuan yang sama sudah ada pada kode komponen ini.', { key: duplicateVariantKey }, 409);
  if (rows.some((row) => text_(row['ID VARIAN']) === text_(record.variantId))) throwApi_('DUPLICATE_VARIANT_ID', 'ID VARIAN sudah digunakan.', { variantId: record.variantId }, 409);
  appendObject_(sheet, hargaObject_(record, nextNo_(rows)));
  SpreadsheetApp.flush();
  if (!objects_(sheet).some((row) => hargaKey_(row) === key)) throwApi_('WRITE_VERIFY_FAILED', 'Verifikasi CREATE HARGA gagal.', { key: key }, 500);
}

function updateHarga_(record) {
  validateHarga_(record);
  const sheet = getRuntimeSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), 'price');
  const rows = objects_(sheet);
  const key = hargaKey_(record);
  const originalKey = record.original ? hargaKey_(record.original) : key;
  const originalVariantId = text_((record.original && record.original.variantId) || record.variantId);
  const rowIndex = originalVariantId
    ? rows.findIndex((row) => text_(row['ID VARIAN']) === originalVariantId)
    : rows.findIndex((row) => hargaKey_(row) === originalKey);
  if (rowIndex < 0) throwApi_('NOT_FOUND', 'Record HARGA BAHAN untuk update tidak ditemukan.', { key: key, originalKey: originalKey }, 404);
  const duplicateIndex = rows.findIndex((row, index) => index !== rowIndex && hargaKey_(row) === key);
  if (duplicateIndex >= 0) throwApi_('DUPLICATE_HARGA', 'Identitas HARGA BAHAN hasil rename sudah digunakan data lain.', { key: key }, 409);
  if (!text_(record.componentCode)) record.componentCode = text_(rows[rowIndex]['KODE KOMPONEN']);
  if (!text_(record.variantId)) record.variantId = text_(rows[rowIndex]['ID VARIAN']);
  if (originalVariantId && text_(record.variantId) !== originalVariantId) throwApi_('VARIANT_ID_IMMUTABLE', 'ID VARIAN tidak boleh berubah saat update.', { originalVariantId: originalVariantId, variantId: record.variantId }, 409);
  const duplicateVariantKey = variantDuplicateKey_(record);
  const duplicateVariantIndex = rows.findIndex((row, index) => index !== rowIndex && variantDuplicateKey_(row) === duplicateVariantKey);
  if (duplicateVariantIndex >= 0) throwApi_('DUPLICATE_VARIANT', 'Varian dengan merek, spesifikasi, dan satuan yang sama sudah ada pada kode komponen ini.', { key: duplicateVariantKey }, 409);
  const mergedRecord = mergeHargaRecordWithExisting_(record, rows[rowIndex]);
  updateObjectRow_(sheet, rowIndex + 2, hargaObject_(mergedRecord, rows[rowIndex]['NO']));
  SpreadsheetApp.flush();
  if (!objects_(sheet).some((row) => hargaKey_(row) === key)) throwApi_('WRITE_VERIFY_FAILED', 'Verifikasi UPDATE HARGA gagal.', { key: key }, 500);
}

function createAhsp_(record) {
  validateAhsp_(record);
  const sheet = getRuntimeSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), 'ahsp');
  const rows = objects_(sheet);
  const code = text_(record.code);
  if (rows.some((row) => text_(row['KODE AHSP']) === code)) throwApi_('DUPLICATE_AHSP_CODE', 'Kode AHSP ' + code + ' sudah tersedia. Gunakan Update untuk mengubah data.', { code: code }, 409);
  appendAhspRows_(sheet, record);
  SpreadsheetApp.flush();
  verifyAhspCreate_(sheet, code, record.components.length);
}

function updateAhsp_(record) {
  validateAhsp_(record);
  const sheet = getRuntimeSheet_(SpreadsheetApp.openById(SPREADSHEET_ID), 'ahsp');
  const rows = objects_(sheet);
  const code = text_(record.code);
  const matches = [];
  const matchingRows = [];
  const summaryMatches = [];
  rows.forEach((row, index) => {
    if (text_(row['KODE AHSP']) !== code) return;
    const rowNumber = index + 2;
    matchingRows.push(rowNumber);
    const rawType = text_(row['JENIS KOMPONEN']).toUpperCase();
    if (rawType === 'TOTAL PEKERJAAN') summaryMatches.push(rowNumber);
    else if (normalizeType_(rawType)) matches.push(rowNumber);
  });
  if (!matchingRows.length) throwApi_('NOT_FOUND', 'KODE AHSP untuk update tidak ditemukan.', { code: code }, 404);

  const headers = headers_(sheet);
  const newValues = ahspRowValues_(headers, record);
  const insertAfter = Math.max.apply(null, matchingRows);
  let insertedStart = 0;
  let insertedCount = 0;
  let summarySnapshot = null;

  try {
    sheet.insertRowsAfter(insertAfter, newValues.length);
    insertedStart = insertAfter + 1;
    insertedCount = newValues.length;
    sheet.getRange(insertedStart, 1, newValues.length, headers.length).setValues(newValues);
    SpreadsheetApp.flush();
    verifyAhspReplacement_(sheet, insertedStart, insertedCount, code);

    // Existing TOTAL PEKERJAAN is canonical metadata, not a direct-cost row.
    // Preserve it during update and refresh its job metadata without creating
    // a summary row for AHSP records that do not already have one.
    if (summaryMatches.length === 1) {
      const summaryRowNumber = summaryMatches[0];
      summarySnapshot = sheet.getRange(summaryRowNumber, 1, 1, headers.length).getValues()[0];
      const priorSummary = rows[summaryRowNumber - 2];
      const updatedSummary = {
        ...priorSummary,
        'KATEGORI PEKERJAAN': text_(record.category),
        'SUBKATEGORI PEKERJAAN': text_(record.subcategory),
        'ITEM PEKERJAAN': text_(record.name),
        'DASAR / REFERENSI': text_(record.reference),
        'SATUAN': text_(record.unit) || text_(priorSummary['SATUAN']),
        'TAHUN': number_(record.year) || number_(priorSummary['TAHUN']),
        'TANGGAL UPDATE': new Date()
      };
      updateObjectRow_(sheet, summaryRowNumber, updatedSummary);
      SpreadsheetApp.flush();
      const verifiedSummary = objects_(sheet).find((row) => (
        text_(row['KODE AHSP']) === code && text_(row['JENIS KOMPONEN']).toUpperCase() === 'TOTAL PEKERJAAN'
      ));
      if (!verifiedSummary || (text_(record.unit) && text_(verifiedSummary['SATUAN']) !== text_(record.unit))) {
        throw new Error('Verifikasi metadata TOTAL PEKERJAAN gagal.');
      }
    }
  } catch (err) {
    if (summarySnapshot && summaryMatches.length === 1) {
      try { sheet.getRange(summaryMatches[0], 1, 1, headers.length).setValues([summarySnapshot]); } catch (rollbackSummaryErr) {}
    }
    if (insertedStart && insertedCount) {
      try { sheet.deleteRows(insertedStart, insertedCount); } catch (rollbackErr) {}
    }
    throw new Error('Update AHSP dibatalkan sebelum baris lama dihapus: ' + message_(err));
  }

  try {
    matches.sort((a, b) => b - a).forEach((rowNumber) => sheet.deleteRow(rowNumber));
  } catch (err) {
    throw new Error('AHSP baru sudah ditulis lengkap, tetapi pembersihan baris lama gagal. Periksa duplikasi KODE AHSP ' + code + ': ' + message_(err));
  }
}

function appendAhspRows_(sheet, record) {
  const headers = headers_(sheet);
  const values = ahspRowValues_(headers, record);
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function verifyAhspCreate_(sheet, code, expectedCount) {
  const rows = objects_(sheet).filter((row) => text_(row['KODE AHSP']) === code && normalizeType_(row['JENIS KOMPONEN']));
  if (rows.length !== expectedCount) throwApi_('WRITE_VERIFY_FAILED', 'Verifikasi CREATE AHSP gagal.', { code: code, expected: expectedCount, actual: rows.length }, 500);
}

function ahspRowValues_(headers, record) {
  return buildAhspObjects_(record).map((object) => headers.map((header) => object[header] !== undefined ? object[header] : ''));
}

function buildAhspObjects_(record) {
  const base = {
    'KODE AHSP': text_(record.code),
    'KATEGORI PEKERJAAN': text_(record.category),
    'SUBKATEGORI PEKERJAAN': text_(record.subcategory),
    'ITEM PEKERJAAN': text_(record.name),
    'DASAR / REFERENSI': text_(record.reference),
    'TAHUN': number_(record.year) || new Date().getFullYear(),
    'TANGGAL UPDATE': new Date()
  };
  return record.components.map((component) => {
    const type = normalizeType_(component.type);
    if (!type) throw new Error('Jenis komponen AHSP harus TENAGA, BAHAN, atau ALAT.');
    const componentName = text_(component.name);
    const guardedName = componentName.toLowerCase();
    if (guardedName.includes('total pekerjaan') || guardedName.includes('profit') || guardedName.includes('overhead')) {
      throw new Error('Detail AHSP tidak boleh berisi TOTAL PEKERJAAN, PROFIT, atau OVERHEAD.');
    }
    return {
      ...base,
      'JENIS KOMPONEN': type.toUpperCase(),
      'KOMPONEN / URAIAN': componentName,
      'SATUAN': text_(component.unit),
      'KOEFISIEN': number_(component.coefficient),
      'KODE KOMPONEN': text_(component.componentCode),
      ...regionPriceObject_(component.prices || {})
    };
  });
}

function verifyAhspReplacement_(sheet, startRow, rowCount, code) {
  const headers = headers_(sheet);
  const codeCol = headers.indexOf('KODE AHSP') + 1;
  const typeCol = headers.indexOf('JENIS KOMPONEN') + 1;
  if (!codeCol || !typeCol) throw new Error('Header AHSP wajib tidak ditemukan saat verifikasi update.');
  const values = sheet.getRange(startRow, 1, rowCount, headers.length).getValues();
  values.forEach((row) => {
    const rowCode = text_(row[codeCol - 1]);
    const rowType = normalizeType_(row[typeCol - 1]);
    if (rowCode !== code) throw new Error('Verifikasi gagal: KODE AHSP hasil tulis tidak sesuai.');
    if (!rowType) throw new Error('Verifikasi gagal: detail AHSP hanya boleh TENAGA, BAHAN, atau ALAT.');
  });
}

function validateHarga_(record) {
  if (!record) throwApi_('VALIDATION_ERROR', 'record is required');
  if (!normalizeType_(record.type)) throwApi_('VALIDATION_ERROR', 'JENIS KOMPONEN wajib TENAGA, BAHAN, atau ALAT.');
  if (!text_(record.name)) throwApi_('VALIDATION_ERROR', 'NAMA KOMPONEN wajib diisi.');
  if (!text_(record.unit)) throwApi_('VALIDATION_ERROR', 'SATUAN wajib diisi.');
  if (!record.prices || !Object.keys(record.prices).some((key) => !isBlank_(record.prices[key]))) throwApi_('VALIDATION_ERROR', 'Minimal satu harga daerah wajib diisi.');
  if (record.variantId && !record.componentCode) throwApi_('VALIDATION_ERROR', 'componentCode wajib dikirim saat variantId digunakan.');
}

function validateAhsp_(record) {
  if (!record) throwApi_('VALIDATION_ERROR', 'record is required');
  if (!text_(record.code)) throwApi_('VALIDATION_ERROR', 'KODE AHSP wajib diisi.');
  if (!text_(record.name)) throwApi_('VALIDATION_ERROR', 'ITEM PEKERJAAN wajib diisi.');
  if (!Array.isArray(record.components) || !record.components.length) throwApi_('VALIDATION_ERROR', 'AHSP wajib memiliki minimal satu detail komponen.');
  const seen = {};
  record.components.forEach((component) => {
    const key = [text_(record.code), normalizeType_(component.type), canonical_(component.name), canonical_(component.unit), canonical_(component.specification), canonical_(component.brand)].join('|');
    if (seen[key]) throwApi_('DUPLICATE_COMPONENT', 'Komponen AHSP duplikat: ' + text_(component.name), { key: key }, 409);
    seen[key] = true;
  });
}

function hargaObject_(record, noValue) {
  return {
    'NO': noValue,
    'JENIS KOMPONEN': normalizeType_(record.type).toUpperCase(),
    'NAMA KOMPONEN': text_(record.name),
    'SPESIFIKASI': text_(record.specification),
    'MERK': text_(record.brand),
    'SATUAN': text_(record.unit),
    ...regionPriceObject_(record.prices || {}),
    ...regionClassObject_(record.classifications || {}),
    'TAHUN': number_(record.year) || new Date().getFullYear(),
    'TANGGAL UPDATE': new Date(),
    'KETERANGAN SUMBER': text_(record.source),
    'KODE KOMPONEN': text_(record.componentCode),
    'ID VARIAN': text_(record.variantId)
  };
}

function mergeHargaRecordWithExisting_(record, existingRow) {
  const mergedPrices = {};
  const mergedClasses = {};
  REGIONS.forEach((region) => {
    const incomingPrice = pickRegionValue_(record.prices || {}, region, false);
    mergedPrices[region.id] = isBlank_(incomingPrice) ? existingRow[region.column] : incomingPrice;

    const classHeader = 'KLASIFIKASI ' + region.column;
    const incomingClass = pickRegionValue_(record.classifications || {}, region, true);
    mergedClasses[region.id] = isBlank_(incomingClass) ? existingRow[classHeader] : incomingClass;
  });
  return {
    ...record,
    prices: mergedPrices,
    classifications: mergedClasses,
    source: text_(record.source) || text_(existingRow['KETERANGAN SUMBER']),
    year: number_(record.year) || number_(existingRow['TAHUN']) || new Date().getFullYear()
  };
}

function regionPriceObject_(prices) {
  const out = {};
  REGIONS.forEach((region) => {
    const raw = pickRegionValue_(prices, region, false);
    out[region.column] = isBlank_(raw) ? '' : number_(raw);
  });
  return out;
}

function regionClassObject_(classes) {
  const out = {};
  REGIONS.forEach((region) => {
    const key = 'KLASIFIKASI ' + region.column;
    const raw = pickRegionValue_(classes, region, true);
    out[key] = isBlank_(raw) ? '' : raw;
  });
  return out;
}

function pickRegionValue_(object, region, classification) {
  if (!object) return '';
  const column = classification ? 'KLASIFIKASI ' + region.column : region.column;
  if (object[region.id] !== undefined) return object[region.id];
  if (object[column] !== undefined) return object[column];
  return '';
}

function isBlank_(value) {
  return value === undefined || value === null || text_(value) === '';
}

function allocateComponentCode_(ss, type) {
  const prefix = type === 'tenaga' ? 'JS' : type === 'alat' ? 'ALT' : 'BHN';
  const sheet = getRuntimeSheet_(ss, 'counter');
  const rows = objects_(sheet);
  const headers = ensureCounterHeaders_(sheet);
  const keyIndex = rows.findIndex((row) => canonical_(field_(row, ['KEY', 'COUNTER', 'NAMA'])) === canonical_(prefix));
  if (keyIndex < 0) {
    const seededCurrent = maxComponentCounterFromRuntime_(ss, prefix);
    appendCounterRow_(sheet, prefix, seededCurrent);
    SpreadsheetApp.flush();
    return allocateComponentCode_(ss, type);
  }
  const current = number_(field_(rows[keyIndex], ['VALUE', 'NILAI', 'LAST', 'LAST_NUMBER']));
  const next = current + 1;
  const object = { ...rows[keyIndex] };
  const valueHeader = headers.find((header) => ['VALUE', 'NILAI', 'LAST', 'LAST_NUMBER'].includes(header.toUpperCase())) || 'VALUE';
  object[valueHeader] = next;
  updateObjectRow_(sheet, keyIndex + 2, object);
  return prefix + '.' + next;
}

function ensureCounterHeaders_(sheet) {
  let headers = headers_(sheet);
  if (!headers.length || !headers.some((header) => text_(header))) {
    sheet.getRange(1, 1, 1, 2).setValues([['KEY', 'VALUE']]);
    return ['KEY', 'VALUE'];
  }
  let nextColumn = headers.length + 1;
  if (!headers.some((header) => ['KEY', 'COUNTER', 'NAMA'].includes(header.toUpperCase()))) {
    sheet.getRange(1, nextColumn).setValue('KEY');
    headers.push('KEY');
    nextColumn += 1;
  }
  if (!headers.some((header) => ['VALUE', 'NILAI', 'LAST', 'LAST_NUMBER'].includes(header.toUpperCase()))) {
    sheet.getRange(1, nextColumn).setValue('VALUE');
    headers.push('VALUE');
  }
  return headers_(sheet);
}

function appendCounterRow_(sheet, prefix, currentValue) {
  const headers = ensureCounterHeaders_(sheet);
  const keyHeader = headers.find((header) => ['KEY', 'COUNTER', 'NAMA'].includes(header.toUpperCase())) || 'KEY';
  const valueHeader = headers.find((header) => ['VALUE', 'NILAI', 'LAST', 'LAST_NUMBER'].includes(header.toUpperCase())) || 'VALUE';
  const object = {};
  object[keyHeader] = prefix;
  object[valueHeader] = currentValue;
  appendObject_(sheet, object);
}

function maxComponentCounterFromRuntime_(ss, prefix) {
  const allRows = []
    .concat(objects_(getRuntimeSheet_(ss, 'price', false) || emptyRuntimeSheet_()))
    .concat(objects_(getRuntimeSheet_(ss, 'master', false) || emptyRuntimeSheet_()));
  return allRows.reduce((max, row) => {
    const code = text_(row['KODE KOMPONEN']);
    const match = code.match(new RegExp('^' + prefix.replace('.', '\\.') + '\\.(\\d+)$', 'i'));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

function emptyRuntimeSheet_() {
  return {
    getDataRange: function () {
      return {
        getValues: function () { return [[]]; }
      };
    }
  };
}

function allocateVariantId_(priceRows, componentCode) {
  const prefix = text_(componentCode);
  if (!prefix) throwApi_('VALIDATION_ERROR', 'componentCode wajib ada sebelum alokasi variantId.', {}, 400);
  const max = priceRows.reduce((found, row) => {
    if (text_(row['KODE KOMPONEN']) !== prefix) return found;
    const match = text_(row['ID VARIAN']).match(/-V(\d+)$/i);
    return match ? Math.max(found, Number(match[1])) : found;
  }, 0);
  return prefix + '-V' + String(max + 1).padStart(3, '0');
}

function appendObject_(sheet, object) {
  const headers = headers_(sheet);
  sheet.appendRow(headers.map((header) => object[header] !== undefined ? object[header] : ''));
}

function updateObjectRow_(sheet, rowNumber, object) {
  const headers = headers_(sheet);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map((header) => object[header] !== undefined ? object[header] : '')]);
}

function objects_(sheet) {
  if (!sheet) throw new Error('Runtime sheet tidak ditemukan.');
  const values = sheet.getDataRange().getValues();
  const headers = values.shift().map((header) => text_(header));
  return values.map((row) => {
    const object = {};
    headers.forEach((header, index) => object[header] = row[index]);
    return object;
  });
}

function field_(row, names) {
  for (let i = 0; i < names.length; i += 1) {
    const wanted = canonical_(names[i]);
    const key = Object.keys(row).find((header) => canonical_(header) === wanted);
    if (key !== undefined && row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((header) => text_(header));
}

function nextNo_(rows) {
  return rows.reduce((max, row) => Math.max(max, number_(row['NO'])), 0) + 1;
}

function hargaKey_(record) {
  return [
    normalizeType_(record.type || record['JENIS KOMPONEN']),
    canonical_(record.name || record['NAMA KOMPONEN']),
    canonical_(record.unit || record['SATUAN']),
    canonical_(record.specification || record['SPESIFIKASI']),
    canonical_(record.brand || record['MERK']),
    number_(record.year || record['TAHUN']) || new Date().getFullYear()
  ].join('|');
}

function variantDuplicateKey_(record) {
  return [
    text_(record.componentCode || record['KODE KOMPONEN']),
    canonical_(record.brand || record['MERK'] || 'Non Merek'),
    canonical_(record.specification || record['SPESIFIKASI']),
    canonical_(record.unit || record['SATUAN'])
  ].join('|');
}

function canonical_(value) {
  return text_(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function canonicalHeader_(value) {
  return canonical_(value).replace(/[^a-z0-9]+/g, ' ');
}

function ahspId_(code) {
  return 'mrv-ahsp-' + slug_(code);
}

function componentId_(type, name, specification, brand) {
  return ['mrv-comp', normalizeType_(type), slug_(name), slug_(specification || brand || '')].filter(Boolean).join('-');
}

function sourceLabel_(classification) {
  const code = text_(classification);
  if (code === '1') return 'SHBJ/SSH/HSPK Pemda';
  if (code === '2') return 'Vendor/Distributor';
  if (code === '3') return 'Marketplace/Survei';
  if (code === '4') return 'AI';
  return 'Belum diklasifikasikan';
}

function sourceType_(classification) {
  const code = text_(classification);
  if (code === '1') return 'RESMI';
  if (code === '2') return 'SEKUNDER';
  if (code === '3') return 'PASAR';
  return 'MANUAL';
}

function categoryId_(value) {
  const text = text_(value).toLowerCase();
  if (text.includes('struktur')) return 'cat_struktur';
  if (text.includes('elektr')) return 'cat_elektrikal';
  if (text.includes('mekan') || text.includes('plumbing') || text.includes('plambing')) return 'cat_mekanikal';
  if (text.includes('land')) return 'cat_landscape';
  return 'cat_arsitektural';
}

function normalizeType_(value) {
  const text = text_(value).toLowerCase();
  if (text === 'tenaga' || text.includes('tenaga') || text.includes('jasa')) return 'tenaga';
  if (text === 'bahan' || text.includes('bahan') || text.includes('material')) return 'bahan';
  if (text === 'alat' || text.includes('alat')) return 'alat';
  return '';
}

function number_(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const normalized = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function dateText_(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && value > 0) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return new Date(ms).toISOString();
  }
  return text_(value);
}

function slug_(value) {
  return text_(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function message_(err) {
  return err && err.message ? err.message : String(err);
}

function json_(value, status) {
  return ContentService.createTextOutput(JSON.stringify({ ...value, status: status || 200 })).setMimeType(ContentService.MimeType.JSON);
}

