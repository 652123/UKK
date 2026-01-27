# Panduan Deployment ke Vercel

Kode Anda sudah dikonfigurasi agar siap di-deploy ke Vercel (Frontend HTML + Backend Express Serverless).

Ikuti langkah-langkah berikut:

## 1. Push ke GitHub
Karena saya sudah melakukan Commit, Anda tinggal melakukan Push:

```bash
git push origin main
```

Jika ada error (karena perbedaan history), Anda mungkin perlu `git pull` dulu atau force push jika yakin dengan kode lokal (hati-hati):
```bash
git push -u origin main
```

## 2. Deploy di Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Klik **Add New...** > **Project**.
3. Pilih Repository GitHub Anda (misal `UKK`).
4. **Framework Preset**: Pilih **Other** (atau biarkan default, Vercel akan mendeteksi).
5. **Root Directory**: Biarkan `./` (default).

## 3. Konfigurasi Environment Variables (PENTING)
Sebelum klik Deploy, buka bagian **Environment Variables** dan masukkan data berikut (sesuai isi `.env` lokal Anda):

| Key | Value (Contoh) | Catatan |
|-----|----------------|---------|
| `SUPABASE_URL` | `https://xyz.supabase.co` | Dari Project Settings Supabase |
| `SUPABASE_KEY` | `eyJ...` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY`| `eyJ...` | `service_role` (jika dipakai di server) |
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-...` | Dari Midtrans Dashboard |
| `MIDTRANS_CLIENT_KEY` | `SB-Mid-client-...` | Dari Midtrans Dashboard |
| `API_BASE_URL` | `https://nama-project-anda.vercel.app` | **Kosongkan dulu saat deploy pertama**, lalu Edit dan Redeploy setelah dapat URL Vercel. |

> **Tips API_BASE_URL**: Saat pertama deploy, Anda belum tahu URL pastinya. Anda bisa isi dengan `/` (slash saja) jika frontend support relative path, atau biarkan kosong dan update nanti setelah Vercel memberi URL (misal `https://ukk-store.vercel.app`).

## 4. Klik Deploy
Vercel akan memproses build:
- Backend akan menjadi Serverless Functions di folder `/api`.
- Frontend akan menjadi Static Hosting.
- File `vercel.json` akan mengatur routing agar `/api/*` masuk ke backend.

## 5. Tes Aplikasi
Setelah sukses:
- Buka URL Vercel Anda.
- Cek console browser, pastikan `API_BASE_URL` mengarah ke URL Vercel (bukan localhost).
- Coba Checkout/Payment untuk memastikan Midtrans & Supabase jalan.

---
**Catatan Teknis Perubahan yang Dilakukan:**
1. Menambahkan `vercel.json` untuk routing.
2. Membuat `api/index.js` sebagai entry point Vercel.
3. Membuat `package.json` di root agar Vercel menginstall dependency backend.
4. Memperbarui `.gitignore` agar `package.json` ikut ter-upload.
