-- Quick verification of RLS policy fix
-- Check if the UUID/TEXT casting was applied correctly

-- 1. Check current RLS policies
SELECT 
    'Current RLS policies:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname;

-- 2. Test if we can see the specific post that's failing to delete
SELECT 
    'Can we see the failing post?' as test,
    id,
    topic,
    user_id,
    is_public
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 3. Test the DELETE policy logic manually
SELECT 
    'DELETE policy test:' as test,
    id,
    user_id,
    auth.uid() as current_auth_uid,
    auth.uid()::text as auth_uid_as_text,
    (auth.uid()::text = user_id) as should_be_deletable
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 4. Try to delete the specific post that's failing
DELETE FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 5. Check if it was deleted
SELECT 
    'After delete attempt:' as test,
    COUNT(*) as posts_remaining
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 6. Count total user posts
SELECT 
    'Total user posts:' as test,
    COUNT(*) as total_posts
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'; 