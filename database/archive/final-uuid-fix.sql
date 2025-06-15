-- Final fix for UUID/TEXT type mismatch
-- This will properly handle the type casting issue

-- 1. Check current data types to understand the problem
SELECT 
    'user_id column type:' as info,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 2. Drop ALL existing policies completely
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;
DROP POLICY IF EXISTS "users_can_delete_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_insert_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_select_own_posts" ON posts;
DROP POLICY IF EXISTS "users_can_update_own_posts" ON posts;
DROP POLICY IF EXISTS "Users can view public posts and their own posts" ON posts;

-- 3. Create new policies with explicit UUID casting
-- The key is to cast auth.uid() to TEXT to match user_id column

-- SELECT policy: Users can see their own posts + public posts
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        auth.uid()::text = user_id OR 
        is_public = true
    );

-- INSERT policy: Users can only create posts as themselves
CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- UPDATE policy: Users can only update their own posts
CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- DELETE policy: Users can only delete their own posts
CREATE POLICY "posts_delete_policy" ON posts
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- 4. Verify policies were created with correct casting
SELECT 
    'New policies created:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd;

-- 5. Test the DELETE policy with a simple comparison
SELECT 
    'Type casting test:' as test,
    auth.uid() as auth_uid_uuid,
    auth.uid()::text as auth_uid_text,
    pg_typeof(auth.uid()) as auth_uid_type,
    pg_typeof(auth.uid()::text) as auth_uid_text_type;

-- 6. Test on the specific failing post
SELECT 
    'Specific post test:' as test,
    id,
    user_id,
    pg_typeof(user_id) as user_id_type,
    auth.uid()::text as auth_as_text,
    (auth.uid()::text = user_id) as can_delete
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 7. Now try to delete the post
DELETE FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 8. Verify deletion worked
SELECT 
    'Deletion result:' as test,
    COUNT(*) as posts_remaining
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0'; 