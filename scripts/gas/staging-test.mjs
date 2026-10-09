import { writeFileSync } from 'node:fs';

const url = process.env.GAS_STAGING_EXEC_URL || process.env.VITE_MRV_API_URL;
if (!url) {
  console.error('GAS staging test FAIL: set GAS_STAGING_EXEC_URL to the staging /exec URL.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const prefix = `TEST-STAGING-${stamp}`;
const results = { endpoint: url, prefix, tests: {} };

async function get(resource) {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}resource=${resource}`);
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) throw new Error(`${resource} failed: ${JSON.stringify(json)}`);
  return json;
}

async function post(action, record, requestId) {
  const body = new URLSearchParams();
  body.set('action', action);
  body.set('request_id', requestId);
  body.set('record', JSON.stringify(record));
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  });
  const json = await response.json().catch(() => null);
  return { ok: response.ok && json?.ok !== false, status: response.status, json };
}

function assert(name, condition, details = {}) {
  results.tests[name] = { status: condition ? 'PASS' : 'FAIL', ...details };
  if (!condition) throw new Error(`${name} failed: ${JSON.stringify(details)}`);
}

const health = await get('health');
assert('health_staging', health.executionMode === 'staging', { executionMode: health.executionMode });

const setup = await get('setup_staging');
results.setup = setup.setup;

const before = (await get('data')).data;
results.before = {
  components: before.components?.length || 0,
  variants: before.componentVariants?.length || 0,
  prices: before.regionalPrices?.length || 0,
  ahsps: before.ahsps?.length || 0
};

const baseName = `${prefix}-KOMPONEN`;
const createComponent = await post('create_harga', {
  type: 'bahan',
  name: baseName,
  specification: 'SPEC-A',
  brand: 'BRAND-A',
  unit: 'm2',
  year: 2026,
  source: prefix,
  prices: { reg_yogyakarta: 12345, reg_jakarta: 22222 }
}, `${prefix}-create-component`);
assert('create_component', createComponent.ok, { response: createComponent.json });

const dataAfterCreate = createComponent.json.data;
const variantA = dataAfterCreate.componentVariants.find((item) => item.variantName === baseName && item.brand === 'BRAND-A');
assert('create_component_readback', Boolean(variantA?.componentCode && variantA?.variantId), { variantA });

const createVariantRecord = {
  type: 'bahan',
  componentCode: variantA.componentCode,
  name: baseName,
  specification: 'SPEC-B',
  brand: 'BRAND-B',
  unit: 'm2',
  year: 2026,
  source: prefix,
  prices: { reg_yogyakarta: 13000 }
};
const createVariant = await post('create_harga', createVariantRecord, `${prefix}-create-variant`);
assert('create_variant', createVariant.ok, { response: createVariant.json });

const retry = await post('create_harga', createVariantRecord, `${prefix}-create-variant`);
assert('retry_same_request', retry.ok && retry.json?.code === 'IDEMPOTENT_REPLAY', { response: retry.json });

const duplicate = await post('create_harga', createVariantRecord, `${prefix}-duplicate`);
assert('duplicate_prevention', !duplicate.ok && /DUPLICATE/.test(duplicate.json?.code || duplicate.json?.message || ''), { response: duplicate.json });

const updateVariant = await post('update_harga', {
  type: 'bahan',
  componentCode: variantA.componentCode,
  variantId: variantA.variantId,
  name: `${baseName}-RENAMED`,
  specification: 'SPEC-A',
  brand: 'BRAND-A-RENAMED',
  unit: 'm2',
  year: 2026,
  source: `${prefix}-UPDATED`,
  prices: { reg_yogyakarta: 33333 },
  original: {
    type: 'bahan',
    componentCode: variantA.componentCode,
    variantId: variantA.variantId,
    name: baseName,
    specification: 'SPEC-A',
    brand: 'BRAND-A',
    unit: 'm2',
    year: 2026
  }
}, `${prefix}-update-variant`);
assert('update_variant', updateVariant.ok, { response: updateVariant.json });

const yogyakarta = updateVariant.json.data.regionalPrices.find((item) => item.variantId === variantA.variantId && item.region_id === 'reg_yogyakarta');
const jakarta = updateVariant.json.data.regionalPrices.find((item) => item.variantId === variantA.variantId && item.region_id === 'reg_jakarta');
assert('one_region_update_preserves_other_region', yogyakarta?.price === 33333 && jakarta?.price === 22222, { yogyakarta, jakarta });

const ahsp = await post('create_ahsp', {
  code: `TS.${stamp}`,
  category: 'ARSITEKTUR',
  subcategory: prefix,
  name: `${prefix}-AHSP`,
  unit: 'm2',
  reference: prefix,
  year: 2026,
  components: [{
    type: 'bahan',
    componentCode: variantA.componentCode,
    variantId: variantA.variantId,
    name: `${baseName}-RENAMED`,
    unit: 'm2',
    coefficient: 1.5,
    prices: { reg_yogyakarta: 33333 }
  }]
}, `${prefix}-create-ahsp`);
assert('create_ahsp', ahsp.ok, { response: ahsp.json });

const after = (await get('data')).data;
results.after = {
  components: after.components?.length || 0,
  variants: after.componentVariants?.length || 0,
  prices: after.regionalPrices?.length || 0,
  ahsps: after.ahsps?.length || 0
};

writeFileSync('RAB_VIEWER_STAGING_INTEGRATION_TEST.latest.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
