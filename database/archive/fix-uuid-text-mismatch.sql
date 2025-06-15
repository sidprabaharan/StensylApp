-- Fix the UUID/TEXT data type mismatch in RLS policies
-- This is the root cause of the delete failure

-- 1. First, let's check the data types
SELECT 
    'Data type check:' as test,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 2. Check what auth.uid() returns
SELECT 
    'Auth UID type:' as test,
    auth.uid() as auth_uid,
    pg_typeof(auth.uid()) as auth_uid_type;

-- 3. Drop all existing RLS policies
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 4. Create new RLS policies with proper type casting
-- SELECT: Users can see their own posts + public posts from others
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        auth.uid()::text = user_id OR 
        (is_public = true)
    );

-- INSERT: Users can only insert posts as themselves
CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Users can only update their own posts
CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- DELETE: Users can only delete their own posts (with proper type casting)
CREATE POLICY "posts_delete_policy" ON posts
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- 5. Verify the policies were created correctly
SELECT 
    'Fixed RLS policies:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname;

-- 6. Test the fixed DELETE policy
SELECT 
    'DELETE policy test (fixed):' as test,
    id,
    user_id,
    topic,
    (auth.uid()::text = user_id) as delete_policy_result
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 7. Try to delete the problematic post with fixed policy
DELETE FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 8. Check if it was actually deleted
SELECT 
    'Post after delete with fixed policy:' as test,
    COUNT(*) as posts_remaining
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6'; 