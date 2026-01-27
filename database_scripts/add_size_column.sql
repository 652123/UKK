-- Add 'size' column to order_details table to store product size (S, M, L, etc.)
ALTER TABLE order_details ADD COLUMN IF NOT EXISTS size TEXT;
