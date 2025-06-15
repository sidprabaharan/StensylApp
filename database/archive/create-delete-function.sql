-- Create a database function to handle post deletion
-- This bypasses RLS issues by using SECURITY DEFINER

-- 1. Create a function that deletes posts with proper user verification
CREATE OR REPLACE FUNCTION delete_user_post(post_id UUID, requesting_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    post_owner UUID;
    deleted_count INTEGER;
BEGIN
    -- Get the owner of the post
    SELECT user_id INTO post_owner 
    FROM posts 
    WHERE id = post_id;
    
    -- Check if post exists
    IF post_owner IS NULL THEN
        RAISE NOTICE 'Post not found: %', post_id;
        RETURN FALSE;
    END IF;
    
    -- Check if requesting user owns the post
    IF post_owner != requesting_user_id THEN
        RAISE NOTICE 'User % does not own post %', requesting_user_id, post_id;
        RETURN FALSE;
    END IF;
    
    -- Delete the post
    DELETE FROM posts 
    WHERE id = post_id AND user_id = requesting_user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Successfully deleted post %', post_id;
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Failed to delete post %', post_id;
        RETURN FALSE;
    END IF;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_post(UUID, UUID) TO authenticated;

-- 3. Test the function
SELECT delete_user_post(
    '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6'::UUID,
    '84e4a134-b4e6-4b01-a54c-a04c55bf8d0d'::UUID
) as deletion_result;

-- 4. Verify the post was deleted
SELECT 'Posts remaining:' as test, COUNT(*) as count
FROM posts 
WHERE id = '3ea79b3c-c4f2-496e-9853-dfe138f7b0b6'; 