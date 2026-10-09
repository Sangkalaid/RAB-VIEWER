# RAB VIEWER — Deployment Status

Tanggal: 2026-10-09

## Endpoint staging terakhir yang dicek

`https://script.google.com/macros/s/AKfycby4HZjKUzz3XYexyqJ0G73GrGt2yQ72v-iIJY-aYYAhStaDppa_KcX-5ThLakCSgZuF/exec`

Health check terakhir:

- `executionMode`: `staging`
- `schemaVersion`: `component-code-variant-v1`
- runtime sheets:
  - `AHSP (STAGING)`
  - `HARGA BAHAN (STAGING)`
  - `MASTER KOMPONEN (STAGING)`
  - `SYSTEM COUNTERS (STAGING)`

## Status deployment source terbaru

Belum ter-deploy otomatis karena belum tersedia:

- `GAS_STAGING_SCRIPT_ID`
- `GAS_STAGING_DEPLOYMENT_ID`
- autentikasi `clasp` pada mesin ini

## Perintah yang tersedia

Validasi lokal:

```powershell
npm run gas:validate
```

Push source ke Apps Script staging:

```powershell
npm run gas:push
```

Deploy staging:

```powershell
npm run gas:deploy:staging
```

Health check staging:

```powershell
npm run gas:health
```

Integration test staging:

```powershell
npm run gas:test:staging
```

Release staging satu langkah:

```powershell
npm run gas:release:staging
```

## Required environment

```powershell
$env:GAS_STAGING_SCRIPT_ID="..."
$env:GAS_STAGING_DEPLOYMENT_ID="..."
$env:GAS_STAGING_EXEC_URL="https://script.google.com/macros/s/.../exec"
```

## Production safety

Production deployment tidak diubah.

Staging workflow menolak integration test jika health check tidak menunjukkan:

- `executionMode = staging`
- semua `runtimeSheets` memakai suffix `(STAGING)`

