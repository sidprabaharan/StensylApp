-- Simple test to verify delete operations
-- Run this step by step

-- Step 1: Check current posts
SELECT COUNT(*) as before_delete FROM posts WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- Step 2: Try to delete a specific post (use actual ID from logs)
DELETE FROM posts 
WHERE id = '1ff1e36d-16d4-47a5-8c4d-4303ea68a2d8' 
AND user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- Step 3: Check posts after delete
SELECT COUNT(*) as after_delete FROM posts WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- Step 4: Check if the specific post still exists
SELECT 
    'Post still exists?' as check_result,
    id,
    topic
FROM posts 
WHERE id = '1ff1e36d-16d4-47a5-8c4d-4303ea68a2d8';

-- Step 5: Check RLS status
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'posts';

-- Step 6: Try delete without user_id constraint to see if RLS is the issue
-- (This should work if RLS is the problem)
-- DELETE FROM posts WHERE id = '1ff1e36d-16d4-47a5-8c4d-4303ea68a2d8'; 