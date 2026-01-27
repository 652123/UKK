-- Menambahkan kolom province ke tabel profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS province TEXT;
