-- Fix old posts and delete issues
-- This addresses posts with NULL is_public values and RLS policy problems

-- 1. First, let's see what we're dealing with
SELECT 
    'Before fix - posts by visibility:' as status,
    CASE 
        WHEN is_public IS NULL THEN 'NULL (needs fix)'
        WHEN is_public = true THEN 'PUBLIC'
        WHEN is_public = false THEN 'PRIVATE'
    END as visibility,
    COUNT(*) as count
FROM posts 
GROUP BY is_public;

-- 2. Update all old posts with NULL is_public to be public by default
-- This will make them visible and deletable
UPDATE posts 
SET is_public = true 
WHERE is_public IS NULL;

-- 3. Verify the update worked
SELECT 
    'After update - posts by visibility:' as status,
    CASE 
        WHEN is_public IS NULL THEN 'NULL (should be none)'
        WHEN is_public = true THEN 'PUBLIC'
        WHEN is_public = false THEN 'PRIVATE'
    END as visibility,
    COUNT(*) as count
FROM posts 
GROUP BY is_public;

-- 4. Drop all existing RLS policies and recreate them properly
DROP POLICY IF EXISTS "users_can_delete_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_insert_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_select_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_update_own_posts" ON posts;
DROP POLICY IF EXISTS "Users can view public posts and their own posts" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 5. Create clean, simple RLS policies
-- SELECT: Users can see their own posts (public or private) + public posts from others
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        (is_public = true)
    );

-- INSERT: Users can only insert posts as themselves
CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own posts
CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own posts
CREATE POLICY "posts_delete_policy" ON posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Verify the policies were created
SELECT 
    'Final RLS policies:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname;

-- 7. Test delete on a specific post (replace with actual failing post ID)
-- DELETE FROM posts WHERE id = 'fc4b061d-cece-46da-9773-d4b5c56531f3'; 