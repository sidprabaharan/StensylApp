-- =================================================================
-- ENHANCE POSTS FOR SOCIAL FEATURES
-- =================================================================
-- Adds sleek social functionality to existing posts table

-- Add new columns to posts table for social features
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5);

-- Create reactions table for ultra-minimal reactions (🔥 and 👏)
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'clap')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one reaction per user per post
    UNIQUE(post_id, user_id, reaction_type)
);

-- Enable RLS on reactions table
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS post_reactions_post_id_idx ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS post_reactions_user_id_idx ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS posts_is_public_idx ON public.posts(is_public);
CREATE INDEX IF NOT EXISTS posts_title_idx ON public.posts(title);

-- Reactions policies
CREATE POLICY "Anyone can view reactions" ON public.post_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions" ON public.post_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions" ON public.post_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Update posts policy to show public posts to everyone
DROP POLICY IF EXISTS "Users can only view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Users can view public posts and their own posts" ON public.posts
    FOR SELECT USING (
        is_public = true OR auth.uid() = user_id
    );

-- Grant permissions
GRANT ALL ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;

-- =================================================================
-- HELPER FUNCTIONS FOR SOCIAL FEATURES
-- =================================================================

-- Function to get posts with reaction counts for social feed
CREATE OR REPLACE FUNCTION public.get_social_feed(limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    user_name TEXT,
    title TEXT,
    topic TEXT,
    subject TEXT,
    duration TEXT,
    notes TEXT,
    efficiency INTEGER,
    motivation_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    fire_count BIGINT,
    clap_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.user_name,
        p.title,
        p.topic,
        p.subject,
        p.duration,
        p.notes,
        p.efficiency,
        p.motivation_level,
        p.created_at,
        COALESCE(fire_reactions.count, 0) as fire_count,
        COALESCE(clap_reactions.count, 0) as clap_count
    FROM public.posts p
    LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM public.post_reactions 
        WHERE reaction_type = 'fire'
        GROUP BY post_id
    ) fire_reactions ON p.id = fire_reactions.post_id
    LEFT JOIN (
        SELECT post_id, COUNT(*) as count
        FROM public.post_reactions 
        WHERE reaction_type = 'clap'
        GROUP BY post_id
    ) clap_reactions ON p.id = clap_reactions.post_id
    WHERE p.is_public = true
    ORDER BY p.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle reaction
CREATE OR REPLACE FUNCTION public.toggle_reaction(
    post_uuid UUID, 
    reaction_type_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    reaction_exists BOOLEAN;
BEGIN
    -- Check if reaction already exists
    SELECT EXISTS(
        SELECT 1 FROM public.post_reactions 
        WHERE post_id = post_uuid 
        AND user_id = auth.uid() 
        AND reaction_type = reaction_type_param
    ) INTO reaction_exists;
    
    IF reaction_exists THEN
        -- Remove reaction
        DELETE FROM public.post_reactions 
        WHERE post_id = post_uuid 
        AND user_id = auth.uid() 
        AND reaction_type = reaction_type_param;
        RETURN FALSE;
    ELSE
        -- Add reaction
        INSERT INTO public.post_reactions (post_id, user_id, reaction_type)
        VALUES (post_uuid, auth.uid(), reaction_type_param);
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- SOCIAL FEATURES SETUP COMPLETE!
-- =================================================================
-- ✅ Enhanced posts table with title, public/private, motivation
-- ✅ Reactions table for minimal 🔥 and 👏 interactions
-- ✅ Social feed function with reaction counts
-- ✅ Toggle reaction function for clean UX
-- ✅ Updated policies for public/private posts
-- ================================================================= 