# RAB VIEWER

## MRV runtime integration

Operational AHSP, component, and price records are not bundled in this application. Configure `VITE_MRV_API_URL` to a deployed secure API/Google Apps Script endpoint. The frontend reads `/data`; cache/localStorage is limited to UI preferences and must not be used for writes.

The Apps Script source is in `api/google-apps-script/Code.gs`. Deploy it with access restricted to the intended users, then put only its URL in `.env.local`; never put Google credentials or service-account keys in this project.

Aplikasi desktop compact utility untuk mencari, menampilkan, membandingkan, dan mengelola Analisa Harga Satuan Pekerjaan (AHSP) serta Database Harga Satuan Konstruksi secara cepat, efisien, dan presisi.

## Fitur Utama

1. **Cek Harga**: Cari dan bandingkan harga satuan serta rincian AHSP antar daerah secara instan.
2. **Input AHSP**: Kelola dan susun Analisa Harga Satuan Pekerjaan dengan perlindungan Auto Draft otomatis.
3. **Input Harga**: Input dan perbarui harga satuan komponen (Bahan, Tenaga, Alat) lintas daerah.
4. **Kalkulator RAB**: Hitung estimasi Nilai RAB multi-baris secara fleksibel dan akurat.

## Persyaratan Sistem & Desktop Architecture

- Target Platform: Windows Desktop App (`RAB VIEWER.exe`) via Tauri / Native Wrapper
- Ukuran Window Compact: 540–560 px (Width) × 700–720 px (Height)
- Standard: React 19 + Vite + TypeScript + Tailwind CSS

## Menjalankan Aplikasi

```bash
# Install dependencies
npm install

# Typecheck / Lint
npm run lint

# Run development server
npm run dev

# Build production bundle
npm run build
```
