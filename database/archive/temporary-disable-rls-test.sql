-- Temporary test: Disable RLS to see if deletes work
-- WARNING: This temporarily removes security - only for testing!

-- 1. Check current post count
SELECT 'Before RLS disable:' as test, COUNT(*) as posts 
FROM posts WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 2. Disable RLS temporarily
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 3. Try to delete the problematic post
DELETE FROM posts WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 4. Check if it worked
SELECT 'After delete with RLS disabled:' as test, COUNT(*) as posts 
FROM posts WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 5. Check if specific post is gone
SELECT 'Specific post check:' as test, COUNT(*) as exists
FROM posts WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6';

-- 6. Re-enable RLS (IMPORTANT!)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 7. Verify RLS is back on
SELECT 'RLS re-enabled:' as test, rowsecurity 
FROM pg_tables WHERE tablename = 'posts'; 