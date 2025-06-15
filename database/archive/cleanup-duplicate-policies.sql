-- Clean up duplicate RLS policies to avoid conflicts

-- Remove old/duplicate policies
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- Keep only the cleaner named policies:
-- users_can_delete_own_posts (DELETE)
-- users_can_insert_own_posts (INSERT) 
-- users_can_select_own_posts (SELECT) - allows public read
-- users_can_update_own_posts (UPDATE)
-- "Users can view public posts and their own posts" (SELECT) - for public posts

-- Verify final clean policies
SELECT 
    'Final policies:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname; 