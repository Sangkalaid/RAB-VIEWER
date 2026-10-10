# Input Harga dan Input AHSP — trial UI/UX

Tanggal: 2026-10-10. Trial: http://127.0.0.1:3001/

## Ruang lingkup

Pemisahan alur frontend. Apps Script, schema, dan data MRV tidak diubah. Tidak ada POST pengujian ke produksi, deployment, push GitHub, atau packaging EXE pada tahap ini.

## Alur

- Input Harga / Buat Baru: komponen induk baru dan merek pertama; nama baru wajib diisi sendiri walau menggunakan referensi.
- Input Harga / Tambah Merek: dibuka dari hasil pencarian induk; nama, satuan, dan kode induk tetap; merek dan harga baru diisi pengguna.
- Input Harga / Edit: dibuka untuk varian terpilih; merek/harga dapat diedit; identitas induk tetap. Rename induk memerlukan operasi pengelolaan master tersendiri pada tahap backend.
- Mengetik nama/merek atau menggunakan referensi tidak otomatis mengalihkan create menjadi update.
- Input AHSP / Buat Baru: form kosong atau salinan referensi dengan kode baru.
- Input AHSP / Edit: mempertahankan kode/kategori. Identitas edit draft dipertahankan saat pemulihan; target harus tersedia sebelum simpan.
- Banner mode, label aksi spesifik, footer aksi, dialog buang perubahan, dan fieldset terkunci ketika menyimpan digunakan pada kedua form.
- Validasi frontend menolak komponen AHSP kosong, koefisien tidak valid, komponen induk duplikat, dan benturan kode lokal. Backend tetap harus memvalidasi ulang.

## Hasil verifikasi

| Pemeriksaan | Hasil | Bukti / batasan |
|---|---|---|
| Typecheck (`npm run lint`) | PASS | tsc --noEmit |
| Unit regression existing | PASS | 6 tes AHSP unit mapping |
| Frontend build | PASS | Vite; ada warning existing konfigurasi __dirname |
| Input Harga / Buat Baru | PASS | Browser menampilkan mode baru, referensi opsional, input merek biasa |
| Input Harga / Edit HPL | PASS | BHN.11-V001 tetap; mengosongkan merek tidak menghilangkan delapan harga |
| Input Harga / Tambah Merek | PASS | Induk BHN.11/HPL/m2 terkunci; delapan isian harga kosong; SIMPAN MEREK |
| Pembatalan Input Harga | PASS | Dialog aplikasi lalu kembali ke pencarian kosong |
| Input AHSP / Edit A.4.001 | PASS | Kode/kategori tetap, enam komponen dimuat, PERBARUI AHSP |
| Input AHSP / Buat Baru | PASS | Satuan menampilkan Pilih satuan; tidak menampilkan Batang secara keliru |
| Input AHSP / Referensi A.4.001 | PASS | Nama salinan, enam komponen, kode baru A.013; tetap SIMPAN AHSP BARU |
| Pembatalan Input AHSP | PASS | Draft uji dibuang melalui UI tanpa penyimpanan MRV |
| Penyimpanan/create/update live | NOT TESTED | Database dijadwalkan tahap berikutnya |
| Concurrent write/idempotency/backend | NOT TESTED | Tidak tercakup perbaikan UI ini |
| Packaged desktop EXE | NOT TESTED | Tidak dikompilasi |

## Tindak lanjut database

Sebelum menyatakan integrasi siap: pastikan backend mendukung create induk + varian pertama, create varian existing, update berdasarkan ID varian, rename master tersentralisasi, validasi duplikasi, idempotency permanen, kontrol versi edit, dan patch harga per daerah. Perubahan UI ini tidak menyelesaikan celah backend yang tercantum pada audit sebelumnya.
