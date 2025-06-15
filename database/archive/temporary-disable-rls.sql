-- =================================================================
-- TEMPORARY DISABLE RLS - FOR TESTING ONLY
-- =================================================================

-- ⚠️ WARNING: This temporarily disables security!
-- Only use this for testing, then re-enable RLS immediately after

-- Disable RLS temporarily
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Test query - you should now see your posts
SELECT 'Test - Your posts with RLS disabled:' as info;
SELECT COUNT(*) as your_posts_count
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8ddd';

-- Show some of your posts
SELECT 'Your posts:' as info;
SELECT id, topic, subject, created_at
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8ddd'
ORDER BY created_at DESC
LIMIT 5;

-- =================================================================
-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Test delete functionality in your app (should work now)
-- 3. IMMEDIATELY run the re-enable script after testing
-- 4. DO NOT leave RLS disabled in production!
-- =================================================================

-- TO RE-ENABLE RLS AFTER TESTING:
-- ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY; 