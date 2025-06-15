-- =================================================================
-- CHECK ACTUAL DATABASE DATA
-- =================================================================

-- 1. Disable RLS temporarily to see ALL data
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- 2. Check what's actually in the posts table
SELECT 'All posts in database:' as info;
SELECT 
    id,
    user_id,
    user_name,
    topic,
    subject,
    created_at,
    LENGTH(user_id::text) as user_id_length
FROM posts 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check current authenticated user
SELECT 'Current authenticated user:' as info;
SELECT 
    auth.uid() as current_user_id,
    LENGTH(auth.uid()::text) as current_user_id_length,
    auth.jwt() ->> 'email' as user_email;

-- 4. Check for exact matches
SELECT 'Posts matching current user:' as info;
SELECT 
    COUNT(*) as matching_posts,
    user_id
FROM posts 
WHERE user_id::text = auth.uid()::text
GROUP BY user_id;

-- 5. Check for any posts with your specific user ID
SELECT 'Posts with your user ID (84e4a134-b4e6-4b01-a54c-a04c55bf8ddd):' as info;
SELECT 
    id,
    topic,
    subject,
    created_at
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8ddd'
ORDER BY created_at DESC;

-- 6. Re-enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Look for your posts and check if user_ids match
-- 3. This will help us understand the data mismatch
-- ================================================================= 