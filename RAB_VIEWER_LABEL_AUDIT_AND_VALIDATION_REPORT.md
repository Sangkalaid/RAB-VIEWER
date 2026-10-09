# RAB VIEWER — Label AHSP vs MASTER & Validation Report

Tanggal: 2026-10-09

## Status audit relasi terakhir

Read-only API audit terhadap endpoint production terakhir:

- AHSP: 73
- Baris komponen AHSP: 382
- MASTER KOMPONEN: 90
- Varian HARGA: 91
- Regional prices: 728
- Duplikasi kode master: 0
- Duplikasi ID varian: 0
- Kode komponen AHSP yang tidak ada di master: 0
- Varian harga yang tidak ada di master: 0

Status: PASS

## Audit label AHSP vs MASTER

Source `Code.gs` sudah ditambah endpoint read-only:

```text
?resource=audit_labels
```

Endpoint ini mengembalikan:

- KODE AHSP
- KODE KOMPONEN
- URAIAN AHSP
- NAMA MASTER
- SPESIFIKASI
- SATUAN AHSP
- SATUAN MASTER
- klasifikasi:
  - `NAME_ONLY_DIFFERENCE`
  - `TECHNICAL_DIFFERENCE`
  - `MISSING_MASTER`
  - `NO_COMPONENT_CODE`
- rekomendasi perubahan

Status eksekusi live: NOT TESTED

Alasan: endpoint production yang sedang aktif belum memakai `Code.gs` terbaru dengan `audit_labels`.

## Perbaikan permanen mekanisme penyimpanan

Source `Code.gs` sudah diperkuat:

- `create_harga` / `update_harga` memvalidasi `KODE KOMPONEN` terhadap MASTER KOMPONEN.
- `create_ahsp` / `update_ahsp` memvalidasi setiap komponen AHSP terhadap MASTER KOMPONEN.
- Validasi jenis komponen.
- Validasi satuan kompatibel.
- Validasi koefisien > 0.
- Update harga format berkelompok mencari berdasarkan `ID VARIAN`.
- Update satu daerah mempertahankan daerah lain.
- ID VARIAN immutable saat update.
- LockService dan request_id tetap dipakai.

Status source validation:

- GAS validate: PASS
- AHSP regression test: PASS
- Typecheck/lint: PASS

## Pengujian integrasi aplikasi

Read-only API:

- Cek data MRV production: PASS
- Trial browser berjalan di `http://127.0.0.1:3001/`: PASS

Write test production:

- Tambah komponen: NOT TESTED
- Ubah nama komponen: NOT TESTED
- Tambah merek: NOT TESTED
- Ubah merek: NOT TESTED
- Ubah harga regional: NOT TESTED
- Tambah pekerjaan AHSP: NOT TESTED
- Uji kegagalan validasi: NOT TESTED

Alasan: membutuhkan persetujuan eksplisit karena akan menulis ke database production.

## File source terkait

- `api/google-apps-script/Code.gs`
- `api/google-apps-script/Code.production.gs`
- `src/components/compact/InputHargaTab.tsx`
- `src/utils/desktopWindow.ts`

## Langkah berikutnya

1. Deploy `Code.production.gs` terbaru ke Apps Script.
2. Jalankan read-only:

```text
/exec?resource=audit_labels
```

3. Review hasil `NAME_ONLY_DIFFERENCE` vs `TECHNICAL_DIFFERENCE`.
4. Minta persetujuan sebelum normalisasi label atau write test production.

