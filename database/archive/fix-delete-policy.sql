-- =================================================================
-- FIX DELETE POLICY - Ensure users can delete their own posts
-- =================================================================

-- Check current policies on posts table
-- \d+ posts; -- Uncomment this if running manually to see current policies

-- Drop and recreate the delete policy to ensure it's working
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create the delete policy with detailed conditions
CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND
        auth.uid() = user_id
    );

-- Also ensure the RLS is enabled on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Verify all policies are in place
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only view their own posts" ON public.posts;
CREATE POLICY "Users can only view their own posts" ON public.posts
    FOR SELECT USING (auth.uid() = user_id);

-- =================================================================
-- HOW TO USE:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Test delete functionality in your app
-- =================================================================

-- You should see output like:
-- DROP POLICY
-- CREATE POLICY
-- ALTER TABLE
-- CREATE POLICY (x4)

-- If you get any errors, they'll show here and help debug the issue 