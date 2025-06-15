-- Debug the current delete issue
-- Check the specific post that's failing to delete

-- 1. Check if the post exists and its properties
SELECT 
    'Current post check:' as status,
    id,
    topic,
    subject,
    user_id,
    created_at,
    is_public
FROM posts 
WHERE id = 'fc4b061d-cece-46da-9773-d4b5c56531f3';

-- 2. Check all posts for this user
SELECT 
    'All user posts:' as status,
    id,
    topic,
    subject,
    user_id,
    created_at,
    is_public,
    CASE 
        WHEN is_public IS NULL THEN 'NULL (old post)'
        WHEN is_public = true THEN 'PUBLIC'
        WHEN is_public = false THEN 'PRIVATE'
    END as visibility_status
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
ORDER BY created_at DESC;

-- 3. Count posts by visibility
SELECT 
    'Post counts by visibility:' as status,
    CASE 
        WHEN is_public IS NULL THEN 'NULL (old posts)'
        WHEN is_public = true THEN 'PUBLIC'
        WHEN is_public = false THEN 'PRIVATE'
    END as visibility,
    COUNT(*) as count
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'
GROUP BY is_public;

-- 4. Test delete on the specific failing post
-- This will show us exactly what happens
DELETE FROM posts 
WHERE id = 'fc4b061d-cece-46da-9773-d4b5c56531f3' 
AND user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 5. Check if it was actually deleted
SELECT 
    'After delete attempt:' as status,
    COUNT(*) as remaining_posts
FROM posts 
WHERE user_id = '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d';

-- 6. Check if the specific post still exists
SELECT 
    'Specific post after delete:' as status,
    id,
    topic
FROM posts 
WHERE id = 'fc4b061d-cece-46da-9773-d4b5c56531f3'; 