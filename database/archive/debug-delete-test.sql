-- =================================================================
-- DEBUG DELETE FUNCTIONALITY
-- =================================================================

-- 1. Check if RLS is enabled on posts table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'posts';

-- 2. List all current policies on posts table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'posts';

-- 3. Check a sample of posts to see user_id structure
SELECT id, user_id, user_name, topic, created_at 
FROM posts 
LIMIT 5;

-- 4. Check current authenticated user (if any)
SELECT auth.uid() as current_user_id;

-- 5. Test if current user can see their own posts
SELECT COUNT(*) as my_posts_count
FROM posts 
WHERE user_id = auth.uid();

-- 6. Try a test delete (this will show what error occurs)
-- Replace 'your-post-id-here' with an actual post ID from step 3
-- DELETE FROM posts WHERE id = 'your-post-id-here' AND user_id = auth.uid();

-- =================================================================
-- INSTRUCTIONS:
-- 1. Copy this script to Supabase SQL Editor
-- 2. Run it section by section (uncomment the DELETE line for step 6)
-- 3. Look for any errors or unexpected results
-- 4. Share the output to help debug the issue
-- ================================================================= 