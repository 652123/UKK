-- Enable DELETE policy for users on their own pending orders
-- This is required for the "Close Popup = Delete Order" feature to work.

-- 1. Check if Policy exists (Optional, Supabase usually handles 'create policy if not exists' or we drop first)
DROP POLICY IF EXISTS "Users can delete their own pending orders" ON orders;

-- 2. Create Policy
CREATE POLICY "Users can delete their own pending orders"
ON orders
FOR DELETE
USING (
  auth.uid() = user_id
  AND status = 'menunggu_pembayaran' 
);

-- Note: 'menunggu_pembayaran' check prevents accidental deletion of paid orders.
