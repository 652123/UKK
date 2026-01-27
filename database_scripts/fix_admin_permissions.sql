-- FIX: Berikan izin ke role 'admin' untuk mengelola pesanan dan produk

-- 1. Izin Update Pesanan (Untuk Admin)
create policy "Enable Update for Admin on Orders"
on "public"."orders"
for update
to authenticated
using (
  auth.uid() in (
    select id from profiles where role = 'admin' or role = 'bos'
  )
);

-- 2. Izin Update Produk (Untuk Admin)
create policy "Enable Update for Admin on Products"
on "public"."products"
for update
to authenticated
using (
  auth.uid() in (
    select id from profiles where role = 'admin' or role = 'bos'
  )
);

-- 3. Izin Delete Produk (Jika Admin perlu hapus produk)
create policy "Enable Delete for Admin on Products"
on "public"."products"
for delete
to authenticated
using (
  auth.uid() in (
    select id from profiles where role = 'admin' or role = 'bos'
  )
);
