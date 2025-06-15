-- Direct UUID conversion - no validation checks
-- Just convert and fix the policies

-- 1. Check current type
SELECT 
    'Current user_id type:' as info,
    data_type
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 2. Disable RLS
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;

-- 3. Drop all policies
DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
DROP POLICY IF EXISTS "posts_select_policy" ON posts;
DROP POLICY IF EXISTS "posts_update_policy" ON posts;

-- 4. Convert user_id to UUID (this will fail if any values aren't valid UUIDs)
ALTER TABLE posts 
ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 5. Check conversion worked
SELECT 
    'After conversion:' as info,
    data_type
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'user_id';

-- 6. Re-enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 7. Create policies with UUID = UUID (no casting needed)
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

-- 8. Verify policies
SELECT 
    'Policies created:' as status,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'posts';

-- 9. Test delete
DELETE FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0';

-- 10. Check result
SELECT 
    'Delete result:' as test,
    COUNT(*) as remaining
FROM posts 
WHERE id = '695a4182-4900-45fb-b34e-2304019642d0'; 