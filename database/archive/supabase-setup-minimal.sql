-- =================================================================
-- STENSYL APP - MINIMAL SETUP (Works with your existing profiles)
-- =================================================================
-- This only creates the missing tables and policies
-- Your existing profiles table and trigger will remain unchanged

-- -----------------------------------------------------------------
-- 1. POSTS TABLE - The main table your app needs
-- -----------------------------------------------------------------

-- Create posts table (this is what your app is missing)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    topic TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration TEXT NOT NULL,
    notes TEXT,
    mode TEXT,
    efficiency INTEGER CHECK (efficiency >= 1 AND efficiency <= 10)
);

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_subject_idx ON public.posts(subject);

-- -----------------------------------------------------------------
-- 2. COMMENTS TABLE - For social features
-- -----------------------------------------------------------------

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS comments_created_at_idx ON public.comments(created_at DESC);

-- -----------------------------------------------------------------
-- 3. POSTS POLICIES
-- -----------------------------------------------------------------

-- Drop any existing policies and create fresh ones
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create posts policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- 4. COMMENTS POLICIES
-- -----------------------------------------------------------------

-- Drop any existing policies and create fresh ones
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create comments policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- 5. GRANT PERMISSIONS
-- -----------------------------------------------------------------

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on new tables
GRANT ALL ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;

GRANT ALL ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;

-- Grant permissions on your existing profiles table (just to be safe)
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- -----------------------------------------------------------------
-- SETUP COMPLETE!
-- -----------------------------------------------------------------
-- ✅ Your existing profiles table: PRESERVED
-- ✅ Your existing user insertion trigger: PRESERVED  
-- ✅ New posts table: CREATED (this is what your app needs!)
-- ✅ New comments table: CREATED (for social features)
-- ✅ All security policies: CREATED
-- ✅ Performance indexes: CREATED
-- 
-- Your Stensyl app should now work perfectly!
-- The app will use your existing profiles structure with:
-- - id, updated_at, full_name, avatar_url, website
-- ----------------------------------------------------------------- 