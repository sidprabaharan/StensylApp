-- Simple UUID conversion script
-- Convert user_id from TEXT to UUID to fix the type mismatch

-- 1. Check current data types
SELECT 
    'Current user_id type:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 2. Check sample user_id values (without length function)
SELECT 
    'Sample user_id values:' as info,
    user_id,
    CASE 
        WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'Valid UUID format'
        ELSE 'Invalid UUID format'
    END as uuid_check
FROM posts 
LIMIT 3;

-- 3. Disable RLS temporarily
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 5. Convert user_id column to UUID type
ALTER TABLE posts 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 6. Verify conversion worked
SELECT 
    'After conversion:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 7. Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 8. Create new RLS policies with UUID = UUID comparison
CREATE POLICY "posts_select_policy" ON posts
    FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "posts_insert_policy" ON posts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_policy" ON posts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_delete_policy" ON posts
    FOR DELETE
    USING (auth.uid() = user_id);

-- 9. Verify policies created
SELECT 
    'New policies:' as status,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY cmd;

-- 10. Test delete on the failing post
DELETE FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 11. Check if deletion worked
SELECT 
    'Deletion result:' as test,
    COUNT(*) as remaining
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0'; 