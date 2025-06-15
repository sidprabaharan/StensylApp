-- Temporarily disable RLS to test if app deletes work
-- This will help us determine if the issue is RLS or something else

-- 1. Check current posts count
SELECT 'Before RLS disable:' as test, COUNT(*) as posts 
FROM posts WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 2. Disable RLS completely (temporarily removes all security)
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 'RLS status:' as test, rowsecurity 
FROM pg_tables WHERE tablename = 'posts';

-- 4. Now try deleting from the app
-- The app delete should work without RLS blocking it

-- 5. After testing, re-enable RLS (IMPORTANT!)
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY; 