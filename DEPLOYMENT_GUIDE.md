# Panduan Deployment ke Vercel

Project ini sekarang sudah dikonfigurasi untuk siap deploy ke Vercel (Frontend & Backend Serverless dalam satu repo).

## Langkah 1: Push ke GitHub
Karena Anda menggunakan Windows, cara termudah adalah menggunakan **GitHub Desktop** atau Command Line.
1. Commit semua perubahan file yang baru saja dibuat (`package.json`, `vercel.json`, `api/index.js`, dll).
2. Push ke repository GitHub Anda (Buat repo baru jika belum ada).

## Langkah 2: Import ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New...** > **Project**.
3. Import Repository GitHub yang baru Anda push.
4. **Build Settings**: Biarkan default (Vercel akan mendeteksi `package.json` di root).
   - **Framework Preset**: Other (atau biarkan auto detect).
   - **Build Command**: Kosongkan (atau default).
   - **Output Directory**: Kosongkan (atau default `public` jika diminta, tapi biasanya auto).
   
   ⚠️ **PENTING**: Project ini menggunakan struktur Serverless Function untuk backend.

## Langkah 3: Environment Variables (Wajib)
Di halaman konfigurasi "Deploy" (atau di Settings > Environment Variables setelah deploy gagal pertama kali), masukkan variable berikut. **Ambil nilainya dari file `.env` lokal Anda.**

| Nama Variable | Deskripsi | Contoh Nilai |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL Project Supabase | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | Key Anon Public | `eyJhbG...` |
| `MIDTRANS_SERVER_KEY` | Server Key Midtrans | `SB-Mid-server-...` |
| `MIDTRANS_CLIENT_KEY` | Client Key Midtrans | `SB-Mid-client-...` |
| `API_BASE_URL` | **PENTING**: URL Website Vercel Anda | `https://nama-project-anda.vercel.app` |

**Catatan untuk API_BASE_URL**:
- Pada deployment pertama, Anda mungkin belum tahu URL pastinya.
- Anda bisa deploy dulu (mungkin error atau pakai localhost), lalu setelah dapat domain `...vercel.app`, **Update Variable** ini di Settings dan **Redeploy**.
- Jika tidak diisi, website akan mencoba menghubungi `localhost:3000` (Gagal).

## Verifikasi
Setelah deploy sukses:
1. Buka website Anda.
2. Cek Console (F12) -> Ketik `window.API_BASE_URL`. Harus muncul URL Vercel, bukan `__API_BASE_URL__` atau `localhost`.
3. Coba Checkout. Backend akan berjalan via `/api/payment`.
