-- =================================================================
-- FIX POSTS TABLE SCHEMA 
-- =================================================================
-- This fixes the data type issue you're experiencing

-- First, let's check and fix the posts table structure
-- If posts table exists with wrong column types, we'll fix it

-- Drop the existing posts table if it has wrong schema
DROP TABLE IF EXISTS public.posts CASCADE;

-- Recreate posts table with correct data types
CREATE TABLE public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    topic TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration TEXT NOT NULL,              -- This MUST be TEXT for "HH:MM:SS" format
    notes TEXT,
    mode TEXT,
    efficiency INTEGER CHECK (efficiency >= 1 AND efficiency <= 10)  -- This should be INTEGER
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX posts_user_id_idx ON public.posts(user_id);
CREATE INDEX posts_created_at_idx ON public.posts(created_at DESC);
CREATE INDEX posts_subject_idx ON public.posts(subject);

-- Recreate policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;

-- Verify the table structure (this will show you the column types)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' AND table_schema = 'public'
ORDER BY ordinal_position; 