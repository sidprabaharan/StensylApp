-- Final RLS fix with proper UUID policies
-- We know the database operations work, so this should fix the RLS issue

-- 1. Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 3. Create simple, working RLS policies with UUID types
-- SELECT: Users can see their own posts + public posts
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        is_public = true
    );

-- INSERT: Users can only create posts as themselves
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

-- 4. Verify RLS is enabled and policies exist
SELECT 
    'RLS enabled:' as status,
    rowsecurity as enabled
FROM pg_tables 
WHERE tablename = 'posts';

SELECT 
    'Policies created:' as status,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd;

-- 5. Test the policies work by checking auth context
SELECT 
    'Auth test:' as test,
    auth.uid() as current_user,
    pg_typeof(auth.uid()) as auth_type;

-- 6. Test on a specific post
SELECT 
    'Policy test:' as test,
    id,
    user_id,
    (auth.uid() = user_id) as can_delete,
    pg_typeof(user_id) as user_id_type
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
LIMIT 1; 