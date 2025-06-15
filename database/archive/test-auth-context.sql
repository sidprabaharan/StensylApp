-- Test authentication context in database operations
-- This will help us understand why auth.uid() returns NULL during delete operations

-- 1. Check current authentication context
SELECT 
    'Current auth context:' as test,
    auth.uid() as current_user_id,
    auth.jwt() ->> 'sub' as jwt_subject,
    current_user as db_user;

-- 2. Check if we can see posts with current auth
SELECT 
    'Posts visible with current auth:' as test,
    COUNT(*) as visible_posts
FROM posts;

-- 3. Test delete operation with explicit user check
SELECT 
    'Delete test with auth:' as test,
    id,
    user_id,
    auth.uid() as current_auth_uid,
    (auth.uid() = user_id) as auth_matches,
    (auth.uid() IS NOT NULL) as auth_exists
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
LIMIT 1;

-- 4. Check RLS policies are working
SELECT 
    'RLS policy check:' as test,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'posts';

-- 5. Test if we can manually delete (this should work if auth is proper)
-- DO NOT RUN THIS - just for reference
-- DELETE FROM posts 
-- WHERE id = '2caf034d-f58f-405f-9745-b8325a2bbfca' 
-- AND user_id = auth.uid(); 