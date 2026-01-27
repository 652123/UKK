-- Enable Realtime for orders table
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
-- Add products table for realtime stock updates
alter publication supabase_realtime add table products;
