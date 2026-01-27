-- SCRIPT UNTUK MENGHAPUS SEMUA DATA PEMBELIAN (RESET)
-- Jalankan script ini di Supabase SQL Editor

-- 1. Hapus semua data di tabel order_details (Detail Pesanan)
DELETE FROM order_details;

-- 2. Hapus semua data di tabel orders (Pesanan Utama)
DELETE FROM orders;

-- Opsional: Reset sequence ID jika menggunakan auto-increment (serial/identity)
-- ALTER SEQUENCE orders_id_seq RESTART WITH 1;
-- ALTER SEQUENCE order_details_id_seq RESTART WITH 1;
