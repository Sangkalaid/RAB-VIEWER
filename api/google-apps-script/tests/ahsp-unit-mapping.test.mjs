import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../Code.gs', import.meta.url), 'utf8');
const headers = [
  'KODE AHSP', 'KATEGORI PEKERJAAN', 'SUBKATEGORI PEKERJAAN', 'ITEM PEKERJAAN',
  'JENIS KOMPONEN', 'KOMPONEN / URAIAN', 'SATUAN', 'KOEFISIEN',
  'BANJARMASIN', 'JAKARTA', 'MALANG', 'PALEMBANG', 'SEMARANG', 'SOLO',
  'SURABAYA', 'YOGYAKARTA', 'DASAR / REFERENSI', 'TAHUN', 'TANGGAL UPDATE'
];
const priceHeaders = [
  'NO', 'JENIS KOMPONEN', 'NAMA KOMPONEN', 'SPESIFIKASI', 'MERK', 'SATUAN',
  'BANJARMASIN', 'JAKARTA', 'MALANG', 'PALEMBANG', 'SEMARANG', 'SOLO',
  'SURABAYA', 'YOGYAKARTA', 'KLASIFIKASI BANJARMASIN', 'KLASIFIKASI JAKARTA',
  'KLASIFIKASI MALANG', 'KLASIFIKASI PALEMBANG', 'KLASIFIKASI SEMARANG',
  'KLASIFIKASI SOLO', 'KLASIFIKASI SURABAYA', 'KLASIFIKASI YOGYAKARTA',
  'TAHUN', 'TANGGAL UPDATE', 'KETERANGAN SUMBER'
];

function row(code, type, component, unit, coefficient, reference = 'ANALISA STANDAR') {
  return {
    'KODE AHSP': code,
    'KATEGORI PEKERJAAN': 'ARSITEKTUR',
    'SUBKATEGORI PEKERJAAN': 'PLAFOND',
    'ITEM PEKERJAAN': 'Pemasangan Lis Plafond PVC',
    'JENIS KOMPONEN': type,
    'KOMPONEN / URAIAN': component,
    'SATUAN': unit,
    'KOEFISIEN': coefficient,
    'DASAR / REFERENSI': reference,
    'TAHUN': 2026,
    'TANGGAL UPDATE': ''
  };
}

function runParser(ahspRows, priceRows = []) {
  const sheet = (rows, sheetHeaders) => ({ getDataRange: () => ({ getValues: () => [sheetHeaders, ...rows.map((item) => sheetHeaders.map((key) => item[key] ?? ''))] }) });
  const sheets = { AHSP: sheet(ahspRows, headers), 'HARGA BAHAN': sheet(priceRows, priceHeaders) };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: (name) => sheets[name] }) },
    console,
    Date,
    Math,
    Object,
    String,
    Number,
    Array,
    JSON
  };
  vm.runInNewContext(source, context, { filename: 'Code.gs' });
  return context.readMrv_();
}

function runUpdate(existingRows, record) {
  const grid = [headers, ...existingRows.map((item) => headers.map((key) => item[key] ?? ''))];
  const sheet = {
    getDataRange: () => ({ getValues: () => grid.map((row) => [...row]) }),
    getLastColumn: () => headers.length,
    insertRowsAfter(rowNumber, count) {
      grid.splice(rowNumber, 0, ...Array.from({ length: count }, () => Array(headers.length).fill('')));
    },
    deleteRow(rowNumber) { grid.splice(rowNumber - 1, 1); },
    deleteRows(startRow, count) { grid.splice(startRow - 1, count); },
    getRange(startRow, startColumn, rowCount, columnCount) {
      return {
        getValues: () => grid.slice(startRow - 1, startRow - 1 + rowCount).map((row) => row.slice(startColumn - 1, startColumn - 1 + columnCount)),
        setValues(values) {
          values.forEach((valuesRow, rowIndex) => {
            grid[startRow - 1 + rowIndex] = [...grid[startRow - 1 + rowIndex]];
            valuesRow.forEach((value, columnIndex) => { grid[startRow - 1 + rowIndex][startColumn - 1 + columnIndex] = value; });
          });
        }
      };
    }
  };
  const context = {
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush() {} },
    console, Date, Math, Object, String, Number, Array, JSON
  };
  vm.runInNewContext(source, context, { filename: 'Code.gs' });
  context.updateAhsp_(record);
  return grid.slice(1).map((values) => Object.fromEntries(headers.map((key, index) => [key, values[index]])));
}

test('summary row is the AHSP unit source; component units remain per component and summary is excluded', () => {
  const data = runParser([
    row('A.1.001', 'TENAGA', 'Pekerja', 'OH', 0.015),
    row('A.1.001', 'TENAGA', 'Tukang kayu', 'OH', 0.03),
    row('A.1.001', 'BAHAN', 'Lis PVC', "m'", 1.05),
    row('A.1.001', 'TOTAL PEKERJAAN', 'Pemasangan Lis Plafond PVC', "m'", 1)
  ]);
  const ahsp = data.ahsps[0];
  assert.equal(ahsp.unit, "m'");
  assert.equal(ahsp.unit_status, 'AHSP_UNIT_FROM_TOTAL');
  assert.equal(ahsp.reference, 'ANALISA STANDAR');
  assert.equal(ahsp.components.length, 3);
  assert.equal(data.stats.ahspDetails.total_pekerjaan, 1);
  assert.deepEqual(Array.from(ahsp.components, (ref) => data.components.find((component) => component.id === ref.component_id).unit), ['OH', 'OH', "m'"]);
  assert.equal(ahsp.components.some((ref) => /TOTAL PEKERJAAN/i.test(data.components.find((component) => component.id === ref.component_id).name)), false);
});

test('price rows keep specification and brand separate and use regional classification as source', () => {
  const data = runParser([], [{
    'NO': 29,
    'JENIS KOMPONEN': 'BAHAN',
    'NAMA KOMPONEN': 'HPL, 1220 x 2440 x 0,7 mm',
    'SPESIFIKASI': 'HPL',
    'MERK': 'TACO',
    'SATUAN': 'm2',
    'YOGYAKARTA': 77264,
    'KLASIFIKASI YOGYAKARTA': 2,
    'TAHUN': 2026,
    'KETERANGAN SUMBER': '1: SHBJ/SSH/HSPK Pemda | 2: Vendor/Distributor | 3: Marketplace/Survei | 4: AI'
  }]);
  const component = data.components[0];
  const price = data.regionalPrices.find((item) => item.region_id === 'reg_yogyakarta');
  assert.equal(component.specification, 'HPL');
  assert.equal(component.brand, 'TACO');
  assert.equal(price.source, 'Vendor/Distributor');
  assert.equal(price.source_type, 'SEKUNDER');
  assert.equal(price.notes.includes('1: SHBJ'), true);
});

test('missing summary row produces an explicit status and never falls back to the first component unit', () => {
  const data = runParser([row('X.1.001', 'TENAGA', 'Pekerja', 'OH', 1)]);
  assert.equal(data.ahsps[0].unit, '');
  assert.equal(data.ahsps[0].unit_status, 'AHSP_UNIT_NOT_FOUND');
  assert.equal(data.stats.ahspDetails.ahspUnitMissing, 1);
});

test('multiple summary rows are diagnosed and do not select an arbitrary unit', () => {
  const data = runParser([
    row('X.1.002', 'BAHAN', 'Pasir', 'm3', 0.1),
    row('X.1.002', 'TOTAL PEKERJAAN', 'Pekerjaan contoh', 'm2', 1),
    row('X.1.002', 'TOTAL PEKERJAAN', 'Pekerjaan contoh', 'm3', 1)
  ]);
  assert.equal(data.ahsps[0].unit, '');
  assert.equal(data.ahsps[0].unit_status, 'AHSP_MULTIPLE_TOTAL_ROWS');
  assert.equal(data.ahsps[0].components.length, 1);
  assert.equal(data.stats.ahspDetails.ahspUnitMultipleTotals, 1);
});

test('summary reference is kept distinct from component price source fields', () => {
  const data = runParser([
    row('A.1.001', 'TENAGA', 'Pekerja', 'OH', 0.015, 'ANALISA STANDAR'),
    row('A.1.001', 'TOTAL PEKERJAAN', 'Pemasangan Lis Plafond PVC', "m'", 1, 'ANALISA STANDAR')
  ]);
  assert.equal(data.ahsps[0].reference, 'ANALISA STANDAR');
  assert.equal(Object.hasOwn(data.ahsps[0], 'source'), false);
});

test('updating AHSP replaces only cost rows and preserves the existing summary metadata row', () => {
  const updated = runUpdate([
    row('A.1.001', 'TENAGA', 'Pekerja', 'OH', 0.015),
    row('A.1.001', 'TOTAL PEKERJAAN', 'Pemasangan Lis Plafond PVC', "m'", 1)
  ], {
    code: 'A.1.001', category: 'ARSITEKTUR', subcategory: 'PLAFOND',
    name: 'Pemasangan Lis Plafond PVC', unit: "m'", reference: 'ANALISA STANDAR', year: 2026,
    components: [{ type: 'tenaga', name: 'Pekerja', unit: 'OH', coefficient: 0.015, prices: {} }]
  });
  const summary = updated.filter((item) => item['JENIS KOMPONEN'] === 'TOTAL PEKERJAAN');
  assert.equal(summary.length, 1);
  assert.equal(summary[0].SATUAN, "m'");
  assert.equal(summary[0]['KOEFISIEN'], 1);
  assert.equal(updated.filter((item) => ['TENAGA', 'BAHAN', 'ALAT'].includes(item['JENIS KOMPONEN'])).length, 1);
});
