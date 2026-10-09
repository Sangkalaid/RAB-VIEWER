import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const gasDir = join(root, 'api', 'google-apps-script');
const codePath = join(gasDir, 'Code.gs');
const manifestPath = join(gasDir, 'appsscript.json');
const ignorePath = join(gasDir, '.claspignore');

function fail(message) {
  console.error(`GAS validate FAIL: ${message}`);
  process.exit(1);
}

for (const path of [codePath, manifestPath, ignorePath]) {
  if (!existsSync(path)) fail(`required file missing: ${path}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.runtimeVersion !== 'V8') fail('appsscript.json must use V8 runtime');
if (!manifest.webapp) fail('appsscript.json must define webapp settings');

const ignore = readFileSync(ignorePath, 'utf8');
if (!ignore.includes('!Code.gs') || !ignore.includes('!appsscript.json')) {
  fail('.claspignore must only allow Code.gs and appsscript.json');
}

const code = readFileSync(codePath, 'utf8');
const requiredSnippets = [
  "const SHEET_PROFILES",
  "function runtimeSheets_",
  "function assertWritableTarget_",
  "function ensureStagingRuntimeSheets_",
  "function ensureStagingSheetSchema_",
  "function validateSchema_",
  "function validateReferences_",
  "function validateCounters_",
  "function verifyStagingReadWrite_",
  "function allocateComponentCode_",
  "function mergeHargaRecordWithExisting_"
];

for (const snippet of requiredSnippets) {
  if (!code.includes(snippet)) fail(`Code.gs missing required implementation: ${snippet}`);
}

if (/getSheetByName\((AHSP_SHEET|PRICE_SHEET|MASTER_COMPONENT_SHEET|COUNTER_SHEET)\)/.test(code)) {
  fail('Code.gs still has direct production sheet access in runtime read/write path');
}

if (/const\s+EXECUTION_MODE\s*=\s*['"]production['"]/.test(code)) {
  console.warn('GAS validate WARN: EXECUTION_MODE is currently production in source. Change it to staging before staging deployment.');
}

const context = {
  console,
  ContentService: { createTextOutput: () => ({ setMimeType: () => ({}) }), MimeType: { JSON: 'application/json' } },
  SpreadsheetApp: {},
  LockService: {},
  CacheService: {}
};

try {
  vm.runInNewContext(code, context, { filename: 'Code.gs' });
} catch (error) {
  fail(`Code.gs JavaScript parse/eval failed: ${error.message}`);
}

console.log('GAS validate PASS');
