-- Fix RLS policies for wallet-based authentication
-- Since we're using wallet addresses instead of Supabase Auth,
-- we need to adjust the RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can create their own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can update their own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can delete their own webhooks" ON webhooks;
DROP POLICY IF EXISTS "Users can view their webhook logs" ON webhook_logs;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;

-- Option 1: Disable RLS for development
-- This is the simplest approach for development
ALTER TABLE webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policies (commented out)
-- Uncomment these if you want to keep RLS enabled but allow all operations
--
-- CREATE POLICY "Allow all operations on webhooks"
--   ON webhooks FOR ALL
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Allow all operations on webhook_logs"
--   ON webhook_logs FOR ALL
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Allow all operations on rate_limits"
--   ON rate_limits FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Grant permissions for anon role (used by the client)
GRANT ALL ON webhooks TO anon;
GRANT ALL ON webhook_logs TO anon;
GRANT ALL ON rate_limits TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;