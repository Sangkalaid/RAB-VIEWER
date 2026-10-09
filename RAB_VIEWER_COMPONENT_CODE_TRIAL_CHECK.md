# RAB VIEWER — Trial Online Check Kode Permanen & Varian Merek

Tanggal: 2026-10-08

## Endpoint yang dicek

`VITE_MRV_API_URL` dari `.env.local`

## Status struktur MRV live

Endpoint live saat ini masih memakai struktur legacy:

- `components[]` berisi `id`, `name`, `type`, `unit`, `specification`, `brand`.
- `regionalPrices[]` masih memakai `component_id`.
- `ahsps[].components[]` masih memakai `component_id`.

Field/struktur baru belum tersedia:

- `componentCode`: belum ada.
- `variantId`: belum ada.
- `componentMasters`: belum ada.
- `componentVariants`: belum ada.
- relasi AHSP berbasis `componentCode`: belum ada.
- harga regional berbasis `variantId`: belum ada.

## Kesimpulan trial

Trial online untuk sistem kode permanen belum bisa dijalankan secara penuh pada endpoint ini karena API/MRV live belum menyediakan struktur baru.

Aplikasi masih dapat berjalan dengan mode legacy saat ini, tetapi fitur berikut belum boleh dipaksakan dari frontend:

- alokasi kode `BHN.x`, `JS.x`, `ALT.x`;
- alokasi `BHN.x-V001`;
- rename berbasis `variantId`;
- update harga berbasis `variantId`;
- AHSP relation berbasis `componentCode`;
- default variant eksplisit.

## Blocker sebelum implementasi operasional

MRV/API perlu menyediakan minimal:

1. daftar component master dengan `componentCode`;
2. daftar component variant dengan `variantId`;
3. relasi variant ke master lewat `componentCode`;
4. relasi AHSP detail ke master lewat `componentCode`;
5. harga regional yang menunjuk ke `variantId`;
6. action write untuk create/update component dan variant;
7. idempotency/request_id untuk write.

## Rekomendasi aman

Gunakan trial source tanpa compile/package dulu sampai endpoint baru tersedia. Setelah endpoint baru tersedia, lakukan ulang:

1. READ schema validation;
2. read component master;
3. read component variant;
4. read AHSP relation by code;
5. controlled create variant TEST;
6. controlled rename variant TEST;
7. controlled update price TEST;
8. cleanup TEST;
9. baru build/package.
