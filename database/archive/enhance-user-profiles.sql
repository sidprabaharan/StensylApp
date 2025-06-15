-- =================================================================
-- ENHANCE USER PROFILES - ADDITIONAL FEATURES
-- =================================================================
-- Enhances user profile functionality for the social system

-- Ensure all posts have proper user names for display
-- (This will help with testing multiple users)
UPDATE public.posts 
SET user_name = COALESCE(
  (SELECT au.raw_user_meta_data->>'full_name' 
   FROM auth.users au 
   WHERE au.id = posts.user_id),
  'Anonymous User'
)
WHERE user_name IS NULL OR user_name = '';

-- Function to get user profile stats (enhanced version)
CREATE OR REPLACE FUNCTION public.get_user_profile_stats(target_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    total_sessions BIGINT,
    total_duration_seconds BIGINT,
    average_efficiency NUMERIC,
    favorite_subject TEXT,
    recent_sessions BIGINT,
    total_reactions BIGINT,
    current_streak INTEGER,
    stensyl_score INTEGER
) AS $$
DECLARE
    streak_count INTEGER := 0;
    score_calc INTEGER := 0;
BEGIN
    -- Calculate basic stats from public posts only
    SELECT 
        COUNT(*) as sessions,
        COALESCE(SUM(
            CASE 
                WHEN p.duration ~ '^\d{1,2}:\d{2}:\d{2}$' THEN
                    SPLIT_PART(p.duration, ':', 1)::INTEGER * 3600 +
                    SPLIT_PART(p.duration, ':', 2)::INTEGER * 60 +
                    SPLIT_PART(p.duration, ':', 3)::INTEGER
                ELSE 0
            END
        ), 0) as total_duration,
        COALESCE(AVG(p.efficiency), 0) as avg_eff,
        COALESCE(COUNT(*) FILTER (WHERE p.created_at > NOW() - INTERVAL '7 days'), 0) as recent
    INTO total_sessions, total_duration_seconds, average_efficiency, recent_sessions
    FROM public.posts p
    WHERE p.user_id = target_user_id 
    AND p.is_public = true;

    -- Get favorite subject
    SELECT p.subject
    INTO favorite_subject
    FROM public.posts p
    WHERE p.user_id = target_user_id 
    AND p.is_public = true
    GROUP BY p.subject
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Calculate total reactions received
    SELECT COALESCE(COUNT(*), 0)
    INTO total_reactions
    FROM public.post_reactions pr
    JOIN public.posts p ON pr.post_id = p.id
    WHERE p.user_id = target_user_id;

    -- Simple streak calculation (consecutive days with posts)
    -- For now, just use a basic calculation
    streak_count := LEAST(30, COALESCE(recent_sessions::INTEGER, 0));

    -- Calculate Stensyl Score
    score_calc := LEAST(1000, 
        COALESCE(total_sessions::INTEGER * 50, 0) + 
        COALESCE(total_reactions::INTEGER * 10, 0) +
        COALESCE(ROUND(average_efficiency * 100)::INTEGER, 0)
    );

    -- Get user name
    SELECT COALESCE(p.user_name, 'Anonymous') 
    INTO user_name
    FROM public.posts p 
    WHERE p.user_id = target_user_id 
    LIMIT 1;

    -- Return the computed stats
    RETURN QUERY SELECT 
        target_user_id,
        COALESCE(user_name, 'Anonymous'),
        COALESCE(total_sessions, 0),
        COALESCE(total_duration_seconds, 0),
        COALESCE(average_efficiency, 0),
        COALESCE(favorite_subject, 'No data'),
        COALESCE(recent_sessions, 0),
        COALESCE(total_reactions, 0),
        COALESCE(streak_count, 0),
        COALESCE(score_calc, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_profile_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_stats(UUID) TO anon;

-- =================================================================
-- USER PROFILES ENHANCEMENT COMPLETE!
-- =================================================================
-- ✅ Updated user names in existing posts
-- ✅ Created enhanced profile stats function
-- ✅ Added streak and score calculations
-- ✅ Ready for multi-user testing
-- ================================================================= 