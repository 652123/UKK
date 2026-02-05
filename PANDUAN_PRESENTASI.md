# Panduan Presentasi & Sidang UKK (Strategi Durasi 1 Jam)

Waktu 1 jam sebenarnya adalah **"Waktu Maksimal"**. Biasanya terdiri dari:
1.  **Presentasi Teori (Slide)**: 10-15 Menit.
2.  **Demo Aplikasi (Praktek)**: 20-30 Menit.
3.  **Tanya Jawab & Bedah Kode (Sidang)**: 15-20 Menit.

Jangan khawatir kehabisan bahan. Justru waktu 1 jam itu seringkali *kurang* jika penguji antusias bertanya. Gunakan strategi ini untuk mengisi waktu dengan **berbobot**.

---

## 1. Fase Presentasi Teori (10-15 Menit)
Jangan pernah menjawab "Saya bikin ini karena disuruh guru/buat syarat kelulusan". Itu jawaban nilai C.
Jawablah seolah-olah Anda adalah **Konsultan IT** yang sedang menawarkan solusi ke Client.

### Script "Latar Belakang" (Fokus: Official Brand Store):

> "Latar belakang aplikasi ini adalah untuk memperkuat **Branding** dari produk kaos saya sendiri, yaitu **[Nama Brand Anda]**.
> Selama ini, penjualan hanya mengandalkan media sosial (Instagram/WhatsApp) yang campur aduk dengan chat pribadi, sehingga terlihat kurang profesional dan menyulitkan rekap order.
> Dengan adanya Website Official Store ini, tujuannya adalah:
> 1. Menciptakan citra brand yang **Eksklusif dan Profesional** (Trust).
> 2. Memudahkan customer melihat katalog lengkap tanpa harus tanya 'Stok ready gak?' berulang kali.
> 3. Mengamankan data pelanggan untuk promosi (Repeat Order) di masa depan."

### Lanjutan (Alur Data & Database)
Setelah latar belakang kuat, baru masuk teknis:
*   **Alur Data (DFD)**: Jelaskan DFD Level 0 dan 1.
    > "Data mengalir dari Customer -> Proses Pemesanan -> Admin memvalidasi -> Laporan ke Pimpinan."
*   **Struktur Database (ERD)**:
    > "Saya menggunakan Database Relasional. Tabel `users` berelasi dengan `orders`, dan `orders` berelasi dengan `order_items`. Ini memastikan integritas data terjamin."
*   **Teknologi**: Jelaskan kenapa pakai Supabase & Midtrans.
    > "Saya memilih Supabase karena fitur Realtime-nya sangat membantu untuk notifikasi order masuk ke Admin tanpa perlu refresh halaman."

---

## 2. Fase Demo Aplikasi "Slow & Deep" (20-30 Menit)
Lakukan demo dengan **Sangat Detail**. Jangan buru-buru klik. Jelaskan setiap elemen.

### Skenario A: Customer Journey (Pelan-pelan)
1.  **Register & Validasi**: 
    - Coba daftar form kosong -> Tunjukkan error handling "Harap isi semua kolom". (Ini poin plus).
    - Daftar akun baru.
2.  **Explorasi Produk**:
    - Jelaskan fitur Search & Filter. "Fitur ini menggunakan query SQL `ILIKE` untuk pencarian case-insensitive."
    - Klik Detail Produk. Jelaskan informasi apa saja yang tampil.
3.  **Keranjang (Logic)**:
    - Masukkan keranjang.
    - Ubah jumlah qty. Tunjukkan total harga berubah otomatis.
4.  **Checkout & Midtrans**:
    - Saat proses bayar, jelaskan alurnya: "Saat tombol Bayar diklik, sistem me-request Snap Token ke Midtrans..."
    - Lakukan pembayaran.

### Skenario B: Realtime Verification (Nilai Plus)
1.  **Split Screen (Layar Terbagi)** (Jika memungkinkan):
    - Kiri: Halaman Admin (Menu Order).
    - Kanan: Halaman User.
2.  **Tunjukkan Realtime-nya**: "Bapak/Ibu bisa lihat, saat User checkout, di halaman Admin otomatis muncul pesanan baru tanpa saya refresh. Ini berkat fitur Subscription Supabase."

### Skenario C: Admin & Boss
1.  **Manajemen Stok**:
    - Admin tolak pesanan -> Stok balik (Kalau ada fiturnya).
    - Admin terima pesanan -> Stok berkurang.
2.  **Laporan Boss**:
    - Buka halaman laporan. Download PDF. Buka file PDF-nya. Tunjukkan isinya rapi.

---

## 3. Fase Bedah Kode & Database (15-20 Menit)
Ini senjata rahasia untuk menghabiskan waktu dan menunjukkan kamu paham teknis. Ajak penguji melihat "Dapur" aplikasi kamu.

### A. Tunjukkan Database (Supabase Dashboard)
Buka browser tab Supabase.
> "Mari kita lihat datanya masuk ke database secara real, Pak/Bu."
1.  Buka Table **`orders`**: Tunjukkan record pesanan yang barusan dibuat.
2.  Buka Table **`users`**: Tunjukkan data user yang baru register.
3.  **Security**: "Di sini password user sudah di-hash (dienkripsi), jadi saya sebagai admin pun tidak tahu password asli user."

### B. Bedah Kodingan (VS Code)
Tawarkan ke penguji: *"Apakah Bapak/Ibu ingin melihat kode program untuk fitur tertentu?"*
Jika mereka diam, inisiatif tunjukkan file andalanmu:

1.  **`checkout.js` (Integrasi Midtrans)**:
    - Tunjukkan fungsi `payButton.addEventListener`.
    - Jelaskan: "Di sini saya memanggil fungsi `createTransaction` yang me-request token ke backend/edge function."
2.  **`auth.js` / `auth_check.js` (Keamanan)**:
    - Tunjukkan logika proteksi halaman.
    - "File ini mengecek apakah user punya session login. Kalau tidak, akan ditendang (redirect) ke login page. Ini mencegah akses ilegal lewat URL."

---

## 4. Tips Mengulur Waktu (Jika Masih Sisa)
*   **Bahas UI/UX**: "Saya mendesain tombol ini warnanya kontras agar User mudah melihat Call-to-Action."
*   **Bahas Kendala & Solusi**: "Selama pembuatan, saya sempat kesulitan di bagian callback Midtrans, tapi saya mengatasinya dengan membaca dokumentasi resmi dan menggunakan Webhook." (Curhat teknis sangat disukai penguji).
*   **Simulasi Error**: "Misal stok habis, sistem akan menolak tambah keranjang." (Demo error handling).

## Checklist Mental H-1 Jam
- [ ] Koneksi Internet Stabil (Tethering HP Siap).
- [ ] XAMPP / Live Server Jalan.
- [ ] Tab Browser sudah dibuka semua (Web sendiri, Supabase Dashboard, Midtrans Simulator).
- [ ] Mental siap untuk **bercerita**, bukan cuma klik-klik.
