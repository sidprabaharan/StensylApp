-- Test script to verify delete operations
-- Run this before and after delete to see what's actually in the database

-- 1. Show all posts for the current user
SELECT 
    id,
    topic,
    subject,
    duration,
    created_at,
    user_id
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
ORDER BY created_at DESC;

-- 2. Count total posts for user
SELECT COUNT(*) as total_posts 
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 3. Test delete operation (replace with actual post ID)
-- DELETE FROM posts 
-- WHERE id = 'POST_ID_HERE' 
-- AND user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 4. Check if there are any triggers that might interfere
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    t.tgtype,
    t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'posts';

-- 5. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts';

-- 6. Test if we can actually delete (with a specific post ID from the logs)
-- This should show if RLS is blocking the delete
SELECT 
    'Testing delete access...' as test,
    id,
    topic,
    user_id
FROM posts 
WHERE id = '1ff1e36d-16d4-47a5-8c4d-4303ea68a2d8'
AND user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'; 