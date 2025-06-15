-- =================================================================
-- MAKE POSTS PRIVATE - Users can only see their own posts
-- =================================================================

-- Drop the current "everyone can see all posts" policy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- Create a new policy: users can only see their own posts
CREATE POLICY "Users can only view their own posts" ON public.posts
    FOR SELECT USING (auth.uid() = user_id);

-- Keep the other policies the same (insert, update, delete their own posts)
-- These should already be correct, but let's make sure:

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Also make comments private (users can only see comments on their own posts)
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Users can only view comments on their own posts" ON public.comments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.posts WHERE id = post_id
        )
    );

-- =================================================================
-- RESULT: Now users can only see:
-- ✅ Their own posts
-- ✅ Comments on their own posts  
-- ✅ Their own profile data
-- 
-- Users CANNOT see:
-- ❌ Other users' posts
-- ❌ Comments on other users' posts
-- ❌ Other users' private data
-- ================================================================= 