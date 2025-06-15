-- Fix RLS policies to allow users to delete their own posts
-- The current policies are blocking delete operations

-- First, let's see what policies currently exist
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts';

-- Drop existing delete policies if they exist
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON posts;

-- Create a proper delete policy
CREATE POLICY "users_can_delete_own_posts" ON posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Also ensure the select policy allows users to see their own posts
DROP POLICY IF EXISTS "users_can_select_own_posts" ON posts;
CREATE POLICY "users_can_select_own_posts" ON posts
    FOR SELECT
    USING (auth.uid() = user_id OR true); -- Allow public read for social feed

-- Ensure insert policy exists
DROP POLICY IF EXISTS "users_can_insert_own_posts" ON posts;
CREATE POLICY "users_can_insert_own_posts" ON posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure update policy exists  
DROP POLICY IF EXISTS "users_can_update_own_posts" ON posts;
CREATE POLICY "users_can_update_own_posts" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created correctly
SELECT 
    'After fix:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd, policyname; 