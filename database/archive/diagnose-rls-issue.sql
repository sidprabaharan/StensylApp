-- =================================================================
-- DIAGNOSE RLS ISSUE - Why can't user access their own posts?
-- =================================================================

-- 1. Check current user authentication
SELECT 'Current auth status:' as info;
SELECT 
    auth.uid() as current_user_id,
    auth.jwt() ->> 'email' as user_email,
    auth.role() as user_role;

-- 2. Check posts table structure and sample data
SELECT 'Posts table sample (first 3 rows):' as info;
SELECT id, user_id, user_name, topic, created_at 
FROM posts 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Check if there are posts with the current user_id (bypassing RLS)
SELECT 'Posts with current user_id (bypassing RLS):' as info;
SELECT COUNT(*) as matching_posts
FROM posts 
WHERE user_id::text = auth.uid()::text;

-- 4. Check user_id data types and format
SELECT 'User ID format check:' as info;
SELECT 
    DISTINCT user_id,
    pg_typeof(user_id) as user_id_type,
    length(user_id::text) as user_id_length
FROM posts 
LIMIT 5;

-- 5. Check auth.uid() format
SELECT 'Auth UID format:' as info;
SELECT 
    auth.uid() as auth_uid,
    pg_typeof(auth.uid()) as auth_uid_type,
    length(auth.uid()::text) as auth_uid_length;

-- 6. Test exact match with string conversion
SELECT 'Exact match test:' as info;
SELECT 
    user_id::text as post_user_id,
    auth.uid()::text as current_user_id,
    (user_id::text = auth.uid()::text) as exact_match
FROM posts 
WHERE user_id::text = auth.uid()::text
LIMIT 3;

-- 7. Current RLS policies
SELECT 'Current RLS policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts';

-- =================================================================
-- INSTRUCTIONS:
-- 1. Run this script in Supabase SQL Editor
-- 2. Look for mismatches in user_id formats or types
-- 3. Check if auth.uid() returns null
-- 4. Share the results so we can fix the RLS policies
-- ================================================================= 