-- =================================================================
-- STENSYL APP - COMPLETE SUPABASE DATABASE SETUP
-- =================================================================
-- Run these queries in your Supabase SQL Editor in order
-- This will recreate all the tables and policies you need

-- -----------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY AND EXTENSIONS
-- -----------------------------------------------------------------

-- Enable Row Level Security on auth.users (usually already enabled)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------
-- 2. POSTS TABLE - For storing study sessions
-- -----------------------------------------------------------------

-- Drop table if exists (to recreate cleanly)
DROP TABLE IF EXISTS public.posts CASCADE;

-- Create posts table
CREATE TABLE public.posts (
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
CREATE INDEX posts_user_id_idx ON public.posts(user_id);
CREATE INDEX posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX posts_subject_idx ON public.posts(subject);

-- -----------------------------------------------------------------
-- 3. COMMENTS TABLE - For post comments (optional, based on your app structure)
-- -----------------------------------------------------------------

-- Drop table if exists
DROP TABLE IF EXISTS public.comments CASCADE;

-- Create comments table
CREATE TABLE public.comments (
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
CREATE INDEX comments_post_id_idx ON public.comments(post_id);
CREATE INDEX comments_user_id_idx ON public.comments(user_id);
CREATE INDEX comments_created_at_idx ON public.comments(created_at DESC);

-- -----------------------------------------------------------------
-- 4. USER PROFILES TABLE - Extended user information (optional)
-- -----------------------------------------------------------------

-- Drop table if exists
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table for additional user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------
-- 5. ROW LEVEL SECURITY POLICIES
-- -----------------------------------------------------------------

-- POSTS POLICIES
-- Users can view all posts (for the social feed)
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS POLICIES
-- Users can view all comments
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- PROFILES POLICIES
-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- -----------------------------------------------------------------
-- 6. FUNCTIONS AND TRIGGERS
-- -----------------------------------------------------------------

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------
-- 7. SAMPLE DATA (OPTIONAL - Remove if you don't want test data)
-- -----------------------------------------------------------------

-- Insert sample posts (only if you want test data)
-- Uncomment the lines below if you want some sample data to test with
/*
INSERT INTO public.posts (user_id, user_name, topic, subject, duration, notes, mode, efficiency) VALUES
(auth.uid(), 'Test User', 'Mathematics Review', 'Calculus', '01:30:00', 'Reviewed derivatives and integrals', 'Stopwatch', 8),
(auth.uid(), 'Test User', 'Physics Study', 'Mechanics', '00:45:00', 'Newton laws practice', 'Pomodoro', 7);
*/

-- -----------------------------------------------------------------
-- 8. GRANT PERMISSIONS
-- -----------------------------------------------------------------

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;

GRANT ALL ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;

GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- -----------------------------------------------------------------
-- SETUP COMPLETE!
-- -----------------------------------------------------------------
-- Your Stensyl app database is now ready to use!
-- 
-- Tables created:
-- - posts: Study sessions with analytics data
-- - comments: Comments on study posts
-- - profiles: Extended user information
--
-- All tables have proper Row Level Security policies
-- Users can only modify their own data
-- Everyone can view all posts (for social feed feature)
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Your app should now work perfectly!
-- ----------------------------------------------------------------- 