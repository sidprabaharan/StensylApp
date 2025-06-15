-- Convert user_id column from TEXT to UUID to fix type mismatch
-- This is the proper solution - user IDs should be UUID type

-- 1. First, check current data types
SELECT 
    'Current user_id type:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 2. Check a sample of user_id values to ensure they're valid UUIDs
SELECT 
    'Sample user_id values:' as info,
    user_id,
    length(user_id) as id_length,
    CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID format'
        ELSE 'Invalid UUID format'
    END as uuid_check
FROM posts 
LIMIT 5;

-- 3. Temporarily disable RLS to avoid policy conflicts during column change
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies before changing column type
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 5. Convert user_id column from TEXT to UUID
-- This will only work if all existing values are valid UUIDs
ALTER TABLE posts 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 6. Verify the column type change worked
SELECT 
    'After conversion:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 7. Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 8. Create new RLS policies with proper UUID comparison (no casting needed!)
-- SELECT: Users can see their own posts + public posts
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        is_public = true
    );

-- INSERT: Users can only create posts as themselves
CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own posts
CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own posts
CREATE POLICY "posts_delete_policy" ON posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Verify policies were created successfully
SELECT 
    'New UUID-based policies:' as status,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd;

-- 10. Test the DELETE policy on the failing post
SELECT 
    'DELETE test with UUID types:' as test,
    id,
    user_id,
    auth.uid() as current_auth_uid,
    (auth.uid() = user_id) as can_delete,
    pg_typeof(auth.uid()) as auth_type,
    pg_typeof(user_id) as user_id_type
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 11. Try to delete the problematic post
DELETE FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 12. Verify deletion worked
SELECT 
    'Final deletion check:' as test,
    COUNT(*) as posts_remaining
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0'; 