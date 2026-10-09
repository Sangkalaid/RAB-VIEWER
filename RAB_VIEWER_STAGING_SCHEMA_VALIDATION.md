# RAB VIEWER — Staging Schema Validation

Tanggal: 2026-10-09

## Root cause

Staging endpoint sudah memakai sheet staging, tetapi sheet staging yang sudah ada tidak selalu memiliki header/schema valid. Dampaknya:

- `setup_staging` terlihat berhasil;
- runtimeSheets sudah staging;
- data staging terbaca 0;
- write verification gagal.

## Perbaikan source

`Code.gs` sekarang memiliki endpoint dan fungsi validasi:

- `?resource=validate_schema`
- `?resource=verify_staging`
- `validateSchema_()`
- `ensureStagingRuntimeSheets_()`
- `ensureStagingSheetSchema_()`
- `ensureRequiredHeaders_()`
- `validateReferences_()`
- `validateCounters_()`
- `verifyStagingReadWrite_()`

## Prinsip migrasi schema

- Tidak menghapus data staging existing.
- Tidak menyalin seluruh data production ke `AHSP (STAGING)` dan `HARGA BAHAN (STAGING)`.
- Header yang belum ada ditambahkan.
- Kolom existing tidak dihapus.
- Mapping baca/tulis tetap berbasis header.
- `MASTER KOMPONEN (STAGING)` dan `SYSTEM COUNTERS (STAGING)` boleh menerima reference rows karena diperlukan untuk alokasi kode staging.

## Canonical required schema

AHSP staging minimal:

- `KODE AHSP`
- `KATEGORI PEKERJAAN`
- `ITEM PEKERJAAN`
- `JENIS KOMPONEN`
- `KOMPONEN / URAIAN`
- `SATUAN`
- `KOEFISIEN`
- `DASAR / REFERENSI`
- `KODE KOMPONEN`
- kolom regional MRV

HARGA staging minimal:

- `NO`
- `JENIS KOMPONEN`
- `NAMA KOMPONEN`
- `SPESIFIKASI`
- `MERK`
- `SATUAN`
- `KODE KOMPONEN`
- `ID VARIAN`
- `KETERANGAN SUMBER`
- kolom regional MRV

MASTER KOMPONEN staging minimal:

- `KODE KOMPONEN`
- `JENIS KOMPONEN`
- `NAMA KOMPONEN`
- `SATUAN`

SYSTEM COUNTERS staging minimal:

- `KEY`
- `VALUE`

## Status

Source validation lokal: PASS

Cloud validation: menunggu deployment ulang source terbaru.

