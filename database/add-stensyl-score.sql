-- =================================================================
-- STENSYL SCORE SYSTEM - Track and calculate user study scores
-- =================================================================

-- Create stensyl_scores table to store daily/weekly scores
CREATE TABLE IF NOT EXISTS public.stensyl_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score_value INTEGER NOT NULL CHECK (score_value >= 0 AND score_value <= 100),
    score_date DATE NOT NULL,
    score_period TEXT NOT NULL CHECK (score_period IN ('daily', 'weekly')),
    
    -- Score breakdown for transparency
    consistency_points DECIMAL(5,2) DEFAULT 0,
    goal_achievement_points DECIMAL(5,2) DEFAULT 0,
    study_volume_points DECIMAL(5,2) DEFAULT 0,
    focus_quality_points DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    sessions_count INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    goals_completed INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one score per user per date per period
    UNIQUE(user_id, score_date, score_period)
);

-- Enable RLS on stensyl_scores table
ALTER TABLE public.stensyl_scores ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS stensyl_scores_user_id_idx ON public.stensyl_scores(user_id);
CREATE INDEX IF NOT EXISTS stensyl_scores_date_idx ON public.stensyl_scores(score_date);
CREATE INDEX IF NOT EXISTS stensyl_scores_value_idx ON public.stensyl_scores(score_value);
CREATE INDEX IF NOT EXISTS stensyl_scores_period_idx ON public.stensyl_scores(score_period);

-- Score policies - users can only view their own scores, leaderboard can view top scores
CREATE POLICY "Users can view their own scores" ON public.stensyl_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON public.stensyl_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores" ON public.stensyl_scores
    FOR UPDATE USING (auth.uid() = user_id);

-- Public policy for leaderboard (only score_value, score_date, anonymous)
CREATE POLICY "Public can view leaderboard data" ON public.stensyl_scores
    FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON public.stensyl_scores TO authenticated;
GRANT SELECT ON public.stensyl_scores TO anon;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_stensyl_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on scores
DROP TRIGGER IF EXISTS handle_stensyl_scores_updated_at ON public.stensyl_scores;
CREATE TRIGGER handle_stensyl_scores_updated_at
    BEFORE UPDATE ON public.stensyl_scores
    FOR EACH ROW EXECUTE FUNCTION public.handle_stensyl_scores_updated_at();

-- =================================================================
-- STENSYL SCORE CALCULATION FUNCTIONS
-- =================================================================

-- Calculate consistency score (0-40 points)
-- Based on study days in the last 7 days, with streak bonuses
CREATE OR REPLACE FUNCTION public.calculate_consistency_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    study_days INTEGER := 0;
    max_streak INTEGER := 0;
    current_streak INTEGER := 0;
    base_score DECIMAL(5,2);
    streak_bonus DECIMAL(5,2);
    i INTEGER;
    has_session BOOLEAN;
BEGIN
    -- Count study days in last 7 days and calculate streaks
    FOR i IN 0..6 LOOP
        SELECT EXISTS(
            SELECT 1 FROM public.posts 
            WHERE user_id = user_uuid 
            AND DATE(created_at) = target_date - i
        ) INTO has_session;
        
        IF has_session THEN
            study_days := study_days + 1;
            current_streak := current_streak + 1;
            max_streak := GREATEST(max_streak, current_streak);
        ELSE
            current_streak := 0;
        END IF;
    END LOOP;
    
    -- Base score: 4 points per study day (max 28)
    base_score := study_days * 4.0;
    
    -- Streak bonus: up to 12 additional points
    streak_bonus := LEAST(max_streak * 2.0, 12.0);
    
    RETURN LEAST(base_score + streak_bonus, 40.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate goal achievement score (0-30 points)
-- Based on daily and weekly goal completion rates
CREATE OR REPLACE FUNCTION public.calculate_goal_achievement_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    daily_goals_met INTEGER := 0;
    daily_goals_total INTEGER := 0;
    weekly_goals_met INTEGER := 0;
    weekly_goals_total INTEGER := 0;
    daily_score DECIMAL(5,2) := 0;
    weekly_score DECIMAL(5,2) := 0;
    week_start DATE;
BEGIN
    week_start := DATE_TRUNC('week', target_date)::DATE;
    
    -- Check daily goals for target date
    WITH daily_progress AS (
        SELECT * FROM public.get_daily_progress(user_uuid, target_date)
    ),
    daily_goals AS (
        SELECT goal_type, target_value 
        FROM public.goals 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND goal_type IN ('daily_minutes', 'daily_sessions')
    )
    SELECT 
        COUNT(*) as total_goals,
        COUNT(CASE 
            WHEN g.goal_type = 'daily_minutes' AND dp.total_minutes >= g.target_value THEN 1
            WHEN g.goal_type = 'daily_sessions' AND dp.total_sessions >= g.target_value THEN 1
        END) as met_goals
    INTO daily_goals_total, daily_goals_met
    FROM daily_goals g
    CROSS JOIN daily_progress dp;
    
    -- Check weekly goals for current week
    WITH weekly_progress AS (
        SELECT * FROM public.get_weekly_progress(user_uuid, week_start)
    ),
    weekly_goals AS (
        SELECT goal_type, target_value 
        FROM public.goals 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND goal_type IN ('weekly_minutes', 'weekly_sessions')
    )
    SELECT 
        COUNT(*) as total_goals,
        COUNT(CASE 
            WHEN g.goal_type = 'weekly_minutes' AND wp.total_minutes >= g.target_value THEN 1
            WHEN g.goal_type = 'weekly_sessions' AND wp.total_sessions >= g.target_value THEN 1
        END) as met_goals
    INTO weekly_goals_total, weekly_goals_met
    FROM weekly_goals g
    CROSS JOIN weekly_progress wp;
    
    -- Calculate scores (15 points max each for daily and weekly)
    IF daily_goals_total > 0 THEN
        daily_score := (daily_goals_met::DECIMAL / daily_goals_total) * 15.0;
    END IF;
    
    IF weekly_goals_total > 0 THEN
        weekly_score := (weekly_goals_met::DECIMAL / weekly_goals_total) * 15.0;
    END IF;
    
    RETURN daily_score + weekly_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate study volume score (0-20 points)
-- Based on total study time with diminishing returns to prevent cramming
CREATE OR REPLACE FUNCTION public.calculate_study_volume_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_minutes INTEGER;
    score DECIMAL(5,2);
BEGIN
    -- Get total study minutes for the day
    SELECT COALESCE(total_minutes, 0) 
    INTO total_minutes
    FROM public.get_daily_progress(user_uuid, target_date);
    
    -- Diminishing returns curve: sqrt function to prevent cramming
    -- 60 minutes = 10 points, 120 minutes = 14 points, 240 minutes = 20 points
    score := LEAST(SQRT(total_minutes / 60.0) * 10.0, 20.0);
    
    RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate focus quality score (0-10 points)
-- Based on efficiency ratings and session patterns
CREATE OR REPLACE FUNCTION public.calculate_focus_quality_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    avg_efficiency DECIMAL(5,2);
    session_count INTEGER;
    score DECIMAL(5,2) := 0;
BEGIN
    -- Get average efficiency and session count for the day
    SELECT 
        AVG(efficiency)::DECIMAL(5,2),
        COUNT(*)
    INTO avg_efficiency, session_count
    FROM public.posts 
    WHERE user_id = user_uuid 
    AND DATE(created_at) = target_date
    AND efficiency IS NOT NULL;
    
    -- Base score from efficiency (0-8 points)
    IF avg_efficiency IS NOT NULL THEN
        score := (avg_efficiency / 10.0) * 8.0;
    END IF;
    
    -- Bonus for multiple focused sessions (up to 2 points)
    IF session_count >= 2 THEN
        score := score + LEAST(session_count * 0.5, 2.0);
    END IF;
    
    RETURN LEAST(score, 10.0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main function to calculate and store daily Stensyl Score
CREATE OR REPLACE FUNCTION public.calculate_daily_stensyl_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    consistency_score DECIMAL(5,2);
    goal_score DECIMAL(5,2);
    volume_score DECIMAL(5,2);
    focus_score DECIMAL(5,2);
    total_score INTEGER;
    session_count INTEGER;
    total_minutes INTEGER;
    goals_met INTEGER;
    goals_total INTEGER;
BEGIN
    -- Calculate individual components
    consistency_score := public.calculate_consistency_score(user_uuid, target_date);
    goal_score := public.calculate_goal_achievement_score(user_uuid, target_date);
    volume_score := public.calculate_study_volume_score(user_uuid, target_date);
    focus_score := public.calculate_focus_quality_score(user_uuid, target_date);
    
    -- Total score (round to integer)
    total_score := ROUND(consistency_score + goal_score + volume_score + focus_score);
    
    -- Get metadata for storage
    SELECT COALESCE(total_minutes, 0), COALESCE(total_sessions, 0)
    INTO total_minutes, session_count
    FROM public.get_daily_progress(user_uuid, target_date);
    
    -- Store or update the score
    INSERT INTO public.stensyl_scores (
        user_id, score_value, score_date, score_period,
        consistency_points, goal_achievement_points, 
        study_volume_points, focus_quality_points,
        sessions_count, total_minutes
    ) VALUES (
        user_uuid, total_score, target_date, 'daily',
        consistency_score, goal_score, volume_score, focus_score,
        session_count, total_minutes
    )
    ON CONFLICT (user_id, score_date, score_period) 
    DO UPDATE SET
        score_value = EXCLUDED.score_value,
        consistency_points = EXCLUDED.consistency_points,
        goal_achievement_points = EXCLUDED.goal_achievement_points,
        study_volume_points = EXCLUDED.study_volume_points,
        focus_quality_points = EXCLUDED.focus_quality_points,
        sessions_count = EXCLUDED.sessions_count,
        total_minutes = EXCLUDED.total_minutes,
        updated_at = NOW();
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current Stensyl Score and breakdown
CREATE OR REPLACE FUNCTION public.get_user_stensyl_score(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    score_value INTEGER,
    consistency_points DECIMAL(5,2),
    goal_achievement_points DECIMAL(5,2),
    study_volume_points DECIMAL(5,2),
    focus_quality_points DECIMAL(5,2),
    sessions_count INTEGER,
    total_minutes INTEGER,
    score_date DATE
) AS $$
BEGIN
    -- Calculate today's score if it doesn't exist
    PERFORM public.calculate_daily_stensyl_score(user_uuid, target_date);
    
    -- Return the score data
    RETURN QUERY
    SELECT 
        s.score_value,
        s.consistency_points,
        s.goal_achievement_points,
        s.study_volume_points,
        s.focus_quality_points,
        s.sessions_count,
        s.total_minutes,
        s.score_date
    FROM public.stensyl_scores s
    WHERE s.user_id = user_uuid 
    AND s.score_date = target_date 
    AND s.score_period = 'daily';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for leaderboard (anonymous, top scores)
CREATE OR REPLACE FUNCTION public.get_leaderboard(score_period TEXT DEFAULT 'daily', limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    score_value INTEGER,
    score_date DATE,
    anonymous_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.score_value,
        s.score_date,
        CONCAT('User', RIGHT(s.user_id::TEXT, 4)) as anonymous_id
    FROM public.stensyl_scores s
    WHERE s.score_period = score_period
    AND s.score_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY s.score_value DESC, s.score_date DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STENSYL SCORE SYSTEM COMPLETE!
-- =================================================================
-- New tables:
-- ✅ stensyl_scores: Store daily/weekly scores with breakdown
--
-- New functions:
-- ✅ calculate_daily_stensyl_score(): Main score calculation
-- ✅ get_user_stensyl_score(): Get user's current score and breakdown
-- ✅ get_leaderboard(): Anonymous leaderboard for competition
--
-- Score Components (0-100):
-- ✅ Consistency (40pts): Study days + streaks
-- ✅ Goal Achievement (30pts): Daily/weekly goal completion
-- ✅ Study Volume (20pts): Total time with anti-cramming curve
-- ✅ Focus Quality (10pts): Efficiency ratings + session patterns
-- ================================================================= 