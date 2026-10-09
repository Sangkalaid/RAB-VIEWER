# RAB VIEWER — Apps Script Automation Report

Tanggal: 2026-10-09

## Root cause

Perubahan `Code.gs` selama ini masih bergantung pada copy-paste manual ke Google Apps Script. Akibatnya source lokal, source cloud, deployment aktif, dan schema staging mudah tidak sinkron.

Masalah yang ditemukan:

- tidak ada `appsscript.json`;
- tidak ada `.clasp.json`/workflow `clasp`;
- tidak ada script npm untuk push/deploy Apps Script;
- deployment aktif tidak bisa dibuktikan cocok dengan source lokal;
- staging schema belum tervalidasi otomatis sebelum write test;
- integration test masih dijalankan manual dari terminal ad-hoc.

## Perbaikan yang dilakukan

Ditambahkan:

- `api/google-apps-script/appsscript.json`
- `api/google-apps-script/.claspignore`
- `api/google-apps-script/.clasp.example.json`
- `scripts/gas/validate.mjs`
- `scripts/gas/health.mjs`
- `scripts/gas/staging-test.mjs`
- `scripts/gas/deploy-staging.ps1`
- npm scripts:
  - `npm run gas:validate`
  - `npm run gas:push`
  - `npm run gas:deploy:staging`
  - `npm run gas:health`
  - `npm run gas:test:staging`
  - `npm run gas:release:staging`

`@google/clasp` sudah dipasang sebagai dev dependency.

## Keamanan credential

Tidak ada OAuth token, `.clasprc.json`, atau credential Google yang disimpan ke repo.

`.gitignore` sudah mengabaikan:

- `api/google-apps-script/.clasp.json`
- `.clasprc.json`

## Cara setup satu kali

Jalankan login:

```powershell
npx clasp login
```

Lalu set environment:

```powershell
$env:GAS_STAGING_SCRIPT_ID="SCRIPT_ID_PROJECT_APPS_SCRIPT_STAGING"
$env:GAS_STAGING_DEPLOYMENT_ID="DEPLOYMENT_ID_STAGING"
$env:GAS_STAGING_EXEC_URL="https://script.google.com/macros/s/.../exec"
```

Catatan:

- `SCRIPT_ID` bukan URL `/exec`.
- `DEPLOYMENT_ID` adalah ID deployment web app.
- Endpoint production tidak digunakan oleh workflow staging.

## Status

Automation source: IMPLEMENTED

Deployment otomatis: BLOCKED sampai `GAS_STAGING_SCRIPT_ID`, `GAS_STAGING_DEPLOYMENT_ID`, dan login `clasp` tersedia.

