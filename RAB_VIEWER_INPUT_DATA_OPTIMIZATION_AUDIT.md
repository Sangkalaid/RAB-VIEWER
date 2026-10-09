# RAB VIEWER — Input Data Optimization Audit

Tanggal audit: 2026-10-09

## Scope

Audit difokuskan pada jalur input data RAB VIEWER ke MRV untuk:

- AHSP / STAGING AHSP
- HARGA BAHAN / STAGING HARGA BAHAN
- identitas permanen `KODE KOMPONEN`
- identitas varian `ID VARIAN`
- idempotency `request_id`
- pencegahan double submit
- integritas update harga daerah

Tidak dilakukan write test ke MRV produksi pada audit ini.

## Temuan dan perbaikan

### 1. Update harga daerah berisiko menghapus daerah lain

Status sebelum:

- Aplikasi dapat mengirim hanya harga daerah yang sedang diisi.
- Backend membentuk ulang seluruh object harga.
- Harga daerah yang tidak dikirim dapat menjadi kosong/0 saat update.

Perbaikan:

- `updateHarga_()` sekarang melakukan merge dengan baris existing sebelum menulis ulang.
- Daerah yang tidak dikirim tetap memakai nilai existing.
- Update satu daerah tidak mengubah harga daerah lain.

File:

- `api/google-apps-script/Code.gs`

### 2. Harga kosong tidak boleh menjadi 0

Status sebelum:

- `regionPriceObject_()` memakai `number_()` untuk semua daerah.
- Nilai kosong dapat berubah menjadi `0`.

Perbaikan:

- Nilai kosong sekarang tetap kosong.
- Hanya nilai yang benar-benar dikirim yang dikonversi menjadi angka.
- Validasi harga memastikan minimal satu harga daerah benar-benar diisi.

File:

- `api/google-apps-script/Code.gs`

### 3. Timeout write MRV

Status sebelum:

- Request tulis MRV dapat menggantung jika koneksi bermasalah.

Perbaikan:

- `postToMRV()` diberi timeout 45 detik.
- Jika timeout, aplikasi menampilkan error dan data tidak dianggap sukses.

File:

- `src/db/rabDatabase.ts`

### 4. Request ID idempotency

Status sebelum:

- Backend sudah mendukung `request_id`.
- Frontend selalu membuat request id otomatis per request.

Perbaikan:

- `postToMRV()` sekarang menerima `request_id` eksplisit jika suatu flow membutuhkan retry dengan ID yang sama.
- Jika tidak dikirim, sistem tetap membuat request id otomatis.

File:

- `src/db/rabDatabase.ts`

## Status yang sudah ada dan dipertahankan

- Apps Script API tetap menjadi satu-satunya jalur write.
- `LockService` tetap aktif di `doPost`.
- `request_id` idempotency tetap aktif.
- Create komponen baru tetap memakai alokasi backend.
- Tambah merek tetap memakai `KODE KOMPONEN` existing dan `ID VARIAN` baru.
- Update/rename varian tetap berdasarkan `ID VARIAN`.
- AHSP tidak menghitung `TOTAL PEKERJAAN` sebagai direct cost.
- Profit & Overhead tetap system calculation.
- MRV tetap single source of truth.

## Risiko / blocker sebelum klaim production-ready

Belum bisa dinyatakan seluruh pengujian staging PASS karena endpoint staging khusus belum diberikan dan audit ini tidak melakukan write test ke produksi.

Yang masih wajib diuji di staging:

- Tambah AHSP baru.
- Tambah komponen baru.
- Tambah merek pada komponen existing.
- Tambah dua merek secara bersamaan.
- Rename merek.
- Update harga satu daerah.
- Input duplikat.
- Double-click tombol Simpan.
- Koneksi terputus saat menyimpan.
- Retry request yang sama.
- Refresh aplikasi setelah penyimpanan.
- Dua pengguna mengedit varian yang sama.
- Perhitungan AHSP setelah perubahan harga.

## Hasil verifikasi source

- Typecheck / lint: PASS
- AHSP unit regression test: PASS
- Production frontend build: PASS

