# 🐛 Debug Delete Issue

## Steps to debug the delete functionality:

### 1. **Run the Fix Policy Script First**
```sql
-- Go to Supabase Dashboard → SQL Editor
-- Copy and paste the content of fix-delete-policy.sql
-- Run the script and check for any errors
```

### 2. **Test in the App**
1. Open the app
2. Go to the Home tab (Feed)
3. Try to delete one of your study sessions
4. Check the console logs in Metro/Expo dev tools

### 3. **What to Look for in Console:**
You should see logs like:
```
Attempting to delete post: [some-uuid]
Current user ID: [your-user-id] 
Post owner ID: [post-owner-id]
Post deleted successfully
```

### 4. **Common Issues & Solutions:**

#### **Issue 1: No delete button visible**
- **Cause**: User ID doesn't match post owner ID
- **Solution**: Check if you're logged in as the same user who created the post

#### **Issue 2: Delete button visible but nothing happens**
- **Cause**: Database policy not applied
- **Solution**: Run the fix-delete-policy.sql script

#### **Issue 3: "Permission denied" or "RLS" error**
- **Cause**: Row Level Security policy issues
- **Solution**: Check Supabase logs and ensure auth.uid() matches user_id

#### **Issue 4: User ID is null**
- **Cause**: Authentication state issue
- **Solution**: Sign out and sign back in

### 5. **Manual Database Check:**
In Supabase Dashboard → Table Editor → posts:
1. Find your post
2. Note the `user_id` field
3. Go to Authentication → Users
4. Find your user and note their `id`
5. These should match for you to delete your own posts

### 6. **Emergency Reset:**
If all else fails, run this in SQL Editor:
```sql
-- TEMPORARILY remove RLS to test (DO NOT USE IN PRODUCTION)
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
-- Test delete, then re-enable:
-- ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
```

### 7. **Create a Test Post:**
1. Go to Study tab
2. Start a timer for 1-2 seconds  
3. End session and save it
4. Go back to Home tab
5. Try to delete the post you just created 