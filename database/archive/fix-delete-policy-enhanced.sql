-- =================================================================
-- ENHANCED DELETE POLICY FIX - Comprehensive solution
-- =================================================================

-- First, let's check what's currently there
SELECT 'Current RLS status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'posts';

SELECT 'Current policies:' as info;
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'posts';

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can only view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.posts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.posts;

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
CREATE POLICY "posts_select_policy" ON public.posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "posts_insert_policy" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_policy" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_policy" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 'New policies created:' as info;
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'posts';

-- Test query to see if current user can access their posts
SELECT 'Test - Your posts count:' as info;
SELECT COUNT(*) as your_posts_count
FROM posts 
WHERE user_id = auth.uid();

-- =================================================================
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Look for any errors in the output
-- 5. Test delete functionality in your app
-- ================================================================= 