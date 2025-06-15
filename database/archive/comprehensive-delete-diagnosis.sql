-- Comprehensive diagnosis of delete failure
-- This will help us identify the exact issue

-- 1. Check current authentication context
SELECT 
    'Current auth context:' as test,
    auth.uid() as current_auth_uid,
    auth.role() as current_role;

-- 2. Check the specific post we're trying to delete
SELECT 
    'Target post details:' as test,
    id,
    user_id,
    topic,
    is_public,
    created_at,
    -- Check if auth.uid() matches user_id
    CASE 
        WHEN auth.uid()::text = user_id THEN 'MATCH - Should be deletable'
        ELSE 'NO MATCH - Will be blocked'
    END as auth_check
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 3. Test the DELETE policy directly
SELECT 
    'DELETE policy test:' as test,
    id,
    user_id,
    topic,
    (auth.uid() = user_id) as delete_policy_result
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 4. Check if we can see the post with SELECT (if we can't select, we can't delete)
SELECT 
    'Can we SELECT this post?' as test,
    COUNT(*) as visible_posts
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 5. Try a simple delete and see what happens
DELETE FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 6. Check if it was actually deleted
SELECT 
    'Post after delete attempt:' as test,
    COUNT(*) as posts_remaining
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 7. Check total posts for user before and after
SELECT 
    'Total user posts:' as test,
    COUNT(*) as total_posts
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 8. Check if RLS is actually enabled
SELECT 
    'RLS status:' as test,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'posts';

-- 9. Check current policies again
SELECT 
    'Current policies:' as test,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'posts' AND cmd = 'DELETE'; 