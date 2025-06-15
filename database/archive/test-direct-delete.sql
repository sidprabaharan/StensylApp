-- Test direct delete operation to verify database functionality
-- This will help us confirm if the issue is database-side or app-side

-- 1. First, let's see what posts exist for this user
SELECT 
    'Current posts for user:' as test,
    id,
    topic,
    subject,
    created_at,
    user_id
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
ORDER BY created_at DESC;

-- 2. Try to delete the specific post that was being deleted in the app
-- (Use the post ID from the console logs: 293c96c4-7d60-42d3-8814-8af112dc28d5)
DELETE FROM posts 
WHERE id = '293c96c4-7d60-42d3-8814-8af112dc28d5' 
AND user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 3. Verify the post was deleted
SELECT 
    'Posts remaining after delete:' as test,
    COUNT(*) as count
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 4. Check if the specific post still exists
SELECT 
    'Specific post check:' as test,
    id,
    topic
FROM posts 
WHERE id = '293c96c4-7d60-42d3-8814-8af112dc28d5';

-- 5. List remaining posts
SELECT 
    'Remaining posts:' as test,
    id,
    topic,
    subject,
    created_at
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
ORDER BY created_at DESC; 