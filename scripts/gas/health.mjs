const url = process.env.GAS_STAGING_EXEC_URL || process.env.VITE_MRV_API_URL;

if (!url) {
  console.error('GAS health FAIL: set GAS_STAGING_EXEC_URL to the staging /exec URL.');
  process.exit(1);
}

const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}resource=health`);
const health = await response.json().catch(() => null);

if (!response.ok || !health?.ok) {
  console.error('GAS health FAIL:', health || response.status);
  process.exit(1);
}

const expectedSheets = [
  'AHSP (STAGING)',
  'HARGA BAHAN (STAGING)',
  'MASTER KOMPONEN (STAGING)',
  'SYSTEM COUNTERS (STAGING)'
];

const runtimeSheets = Array.isArray(health.runtimeSheets) ? health.runtimeSheets : [];
const missing = expectedSheets.filter((sheet) => !runtimeSheets.includes(sheet));

if (health.executionMode !== 'staging') {
  console.error(`GAS health FAIL: executionMode is ${health.executionMode}, expected staging.`);
  process.exit(1);
}

if (missing.length) {
  console.error(`GAS health FAIL: missing staging runtime sheets: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  endpoint: url,
  apiVersion: health.apiVersion,
  schemaVersion: health.schemaVersion,
  executionMode: health.executionMode,
  spreadsheetId: health.spreadsheetId,
  runtimeSheets
}, null, 2));
