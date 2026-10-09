# RAB VIEWER — Staging Integration Test

Tanggal: 2026-10-09

## Status

BLOCKED — menunggu deployment ulang `Code.gs` terbaru melalui workflow otomatis atau manual terakhir.

## Endpoint staging terakhir

`https://script.google.com/macros/s/AKfycby4HZjKUzz3XYexyqJ0G73GrGt2yQ72v-iIJY-aYYAhStaDppa_KcX-5ThLakCSgZuF/exec`

Health check: PASS

- `executionMode`: staging
- runtimeSheets: seluruhnya sheet staging

## Hasil test terakhir sebelum patch schema

| Skenario | Status | Catatan |
|---|---:|---|
| Health staging | PASS | Endpoint sudah staging |
| setup_staging | PASS | Sheet staging ada |
| Create component | FAIL | Write verification gagal karena schema/header staging invalid |
| Create variant | FAIL | Terdampak schema/header staging |
| Retry request_id | FAIL | Request pertama gagal sehingga replay tidak valid |
| Duplicate prevention | NOT VALID | Terdampak create failure |
| Rename/update variant | FAIL | Read-back tidak menemukan record |
| Update satu harga daerah | FAIL | Read-back tidak menemukan record |
| Create AHSP | FAIL | Read-back tidak menemukan record |
| Concurrent create | FAIL | Terdampak schema/header staging |

## Perbaikan setelah test terakhir

`Code.gs` sudah diperbarui agar:

- `setup_staging` memperbaiki header staging yang kosong/rusak;
- required headers ditambahkan tanpa menghapus kolom/data existing;
- `validate_schema` tersedia;
- `verify_staging` tersedia;
- counter staging bisa diinisialisasi aman;
- tidak ada fallback write ke sheet production.

## Test runner otomatis

Integration test sekarang tersedia:

```powershell
npm run gas:test:staging
```

Test runner melakukan:

- health check staging;
- setup staging;
- create component;
- create variant;
- retry request_id sama;
- duplicate prevention;
- rename/update variant;
- update satu harga daerah dan validasi daerah lain tetap;
- create AHSP;
- read-back final.

Output detail disimpan ke:

`RAB_VIEWER_STAGING_INTEGRATION_TEST.latest.json`

## Langkah berikutnya

1. Deploy source Apps Script terbaru.
2. Jalankan:

```powershell
npm run gas:health
npm run gas:test:staging
```

3. Jika semua PASS, lanjutkan frontend staging refresh/calculation verification.

