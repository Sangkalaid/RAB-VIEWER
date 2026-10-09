# RAB VIEWER — Staging Test Sheet Isolation

Tanggal: 2026-10-09

## Konfigurasi staging

Spreadsheet MRV yang digunakan:

`1zQj-rFSGyqe1VQtdqvNplxdRtrWeCfz9ra5dh_NANGw`

Mode staging menggunakan sheet mapping berikut:

| Area | Production | Staging |
|---|---|---|
| AHSP | `AHSP` | `AHSP (STAGING)` |
| Harga | `HARGA BAHAN` | `HARGA BAHAN (STAGING)` |
| Master Komponen | `MASTER KOMPONEN` | `MASTER KOMPONEN (STAGING)` |
| Counter | `SYSTEM COUNTERS` | `SYSTEM COUNTERS (STAGING)` |

## Source guard

`Code.gs` sudah diperbarui agar runtime sheet ditentukan oleh `EXECUTION_MODE`.

Untuk staging:

```javascript
const EXECUTION_MODE = 'staging';
```

Semua operasi write akan memakai sheet staging. Jika mode staging/testing masih menunjuk ke nama sheet produksi, request write ditolak dengan:

`PRODUCTION_WRITE_BLOCKED`

## Setup sheet staging

Endpoint setup tersedia:

```text
?resource=setup_staging
```

Endpoint ini hanya boleh berjalan saat `EXECUTION_MODE` adalah `staging` atau `testing`.

Jika sheet staging belum ada, sistem akan membuat salinan dari sheet produksi terkait tanpa menghapus atau mengubah sheet produksi.

## Status pengujian

Endpoint staging sudah sempat diverifikasi:

```text
executionMode: staging
runtimeSheets:
- AHSP (STAGING)
- HARGA BAHAN (STAGING)
- MASTER KOMPONEN (STAGING)
- SYSTEM COUNTERS (STAGING)
```

Setup staging berhasil:

- `AHSP (STAGING)`: exists
- `HARGA BAHAN (STAGING)`: exists
- `MASTER KOMPONEN (STAGING)`: created_from_MASTER KOMPONEN
- `SYSTEM COUNTERS (STAGING)`: created_from_SYSTEM COUNTERS

Pengujian write pertama dihentikan karena `SYSTEM COUNTERS (STAGING)` tidak memiliki counter `BHN`.

Perbaikan source sudah dibuat:

- jika counter staging kosong/missing, backend menginisialisasi counter dari data staging sendiri;
- tidak fallback ke sheet produksi;
- tetap memakai runtime sheet mapping.

Pengujian kedua menemukan masalah schema staging:

- runtime sudah staging;
- setup sheet staging berhasil;
- tetapi read-back tetap 0 dan verifikasi write gagal karena sheet staging yang sudah ada tidak memiliki header/schema yang valid.

Perbaikan source tambahan:

- `setup_staging` sekarang memperbaiki sheet staging yang ada tetapi header-nya kosong/rusak;
- `AHSP (STAGING)` dan `HARGA BAHAN (STAGING)` hanya menerima header dari production, bukan data production;
- `MASTER KOMPONEN (STAGING)` dan `SYSTEM COUNTERS (STAGING)` menerima header + reference rows karena diperlukan untuk alokasi kode;
- tidak ada fallback write ke sheet production.

Menunggu deployment ulang `Code.gs` terbaru dengan:

```javascript
const EXECUTION_MODE = 'staging';
```

## Verifikasi source lokal

| Verifikasi | Status |
|---|---:|
| Typecheck / lint | PASS |
| AHSP unit regression test | PASS |
| Frontend build | PASS |

## Skenario staging yang akan diuji setelah deployment

| Skenario | Status |
|---|---:|
| Snapshot produksi sebelum test | NOT RUN |
| Verifikasi target sheet staging | PASS |
| Tambah AHSP | BLOCKED: schema staging belum valid pada deployment terakhir |
| Tambah komponen | BLOCKED: schema staging belum valid pada deployment terakhir |
| Tambah merek | NOT RUN |
| Rename merek | NOT RUN |
| Update harga satu daerah | NOT RUN |
| Validasi harga daerah lain tidak berubah | NOT RUN |
| Pencegahan duplikasi | NOT RUN |
| Retry request_id sama | NOT RUN |
| Concurrent create/update | NOT RUN |
| Refresh data aplikasi | NOT RUN |
| Perhitungan AHSP | NOT RUN |
| Snapshot produksi sesudah test | NOT RUN |
| Verifikasi sheet produksi dan backup tidak berubah | NOT RUN |
| Cleanup data uji staging `TEST-STAGING-*` | NOT RUN |

## Blocker saat ini

Perlu deployment ulang Apps Script dengan source terbaru yang memperbaiki counter + schema staging dan mode:

```javascript
const EXECUTION_MODE = 'staging';
```

Setelah endpoint `/exec` terbaru dikirim, health check harus menunjukkan:

- `executionMode: staging`
- `runtimeSheets` berisi sheet `(... STAGING)`

