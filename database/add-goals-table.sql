-- =================================================================
-- GOALS SYSTEM - Add goal tracking to Stensyl
-- =================================================================

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('daily_minutes', 'weekly_sessions', 'daily_sessions', 'weekly_minutes')),
    target_value INTEGER NOT NULL CHECK (target_value > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_active_idx ON public.goals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS goals_type_idx ON public.goals(goal_type);

-- Goals policies - users can only manage their own goals
CREATE POLICY "Users can view their own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.goals TO authenticated;
GRANT SELECT ON public.goals TO anon;

-- Function to update updated_at timestamp for goals
CREATE OR REPLACE FUNCTION public.handle_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on goals
DROP TRIGGER IF EXISTS handle_goals_updated_at ON public.goals;
CREATE TRIGGER handle_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.handle_goals_updated_at();

-- Helper function to get user's active goals
CREATE OR REPLACE FUNCTION public.get_user_active_goals(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    goal_type TEXT,
    target_value INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT g.id, g.goal_type, g.target_value, g.created_at
    FROM public.goals g
    WHERE g.user_id = user_uuid AND g.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate daily progress
CREATE OR REPLACE FUNCTION public.get_daily_progress(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_minutes INTEGER,
    total_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN p.duration ~ '^\d{2}:\d{2}:\d{2}$' THEN
                    EXTRACT(EPOCH FROM p.duration::TIME) / 60
                ELSE 0
            END
        )::INTEGER, 0) as total_minutes,
        COUNT(*)::INTEGER as total_sessions
    FROM public.posts p
    WHERE p.user_id = user_uuid 
    AND DATE(p.created_at) = target_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate weekly progress  
CREATE OR REPLACE FUNCTION public.get_weekly_progress(user_uuid UUID, week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE)
RETURNS TABLE(
    total_minutes INTEGER,
    total_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN p.duration ~ '^\d{2}:\d{2}:\d{2}$' THEN
                    EXTRACT(EPOCH FROM p.duration::TIME) / 60
                ELSE 0
            END
        )::INTEGER, 0) as total_minutes,
        COUNT(*)::INTEGER as total_sessions
    FROM public.posts p
    WHERE p.user_id = user_uuid 
    AND DATE(p.created_at) >= week_start
    AND DATE(p.created_at) < week_start + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- GOALS SYSTEM COMPLETE!
-- =================================================================
-- New tables:
-- ✅ goals: Store user goals (daily minutes, weekly sessions, etc.)
--
-- New functions:
-- ✅ get_user_active_goals(): Get user's current goals
-- ✅ get_daily_progress(): Calculate today's study progress
-- ✅ get_weekly_progress(): Calculate this week's study progress
--
-- Your app can now:
-- ✅ Set and track daily/weekly study goals
-- ✅ Show real-time progress toward goals
-- ✅ Calculate achievement status
-- ================================================================= 