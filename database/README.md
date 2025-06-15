# Stensyl Database Setup

This directory contains all the SQL files needed to set up and configure the Stensyl study tracking app database.

## 🗄️ Database Structure

### Core Setup Files (Run in Order)

1. **`supabase-setup.sql`** - Main database setup
   - Creates the core `posts` table for study sessions
   - Sets up Row Level Security (RLS) policies
   - Creates user profiles and authentication
   - **Run this first**

2. **`enhance-posts-social-fixed.sql`** - Social features
   - Adds social functionality (public/private posts, reactions)
   - Creates `post_reactions` table for 🔥 and 👏 reactions
   - Adds social feed functions
   - **Run after main setup**

3. **`add-goals-table.sql`** - Goals system
   - Creates goals table for daily/weekly study targets
   - Adds goal tracking and progress functions
   - **Run after social features**

4. **`add-stensyl-score.sql`** - Performance scoring
   - Implements the Stensyl performance index calculation
   - Adds scoring functions and daily progress tracking
   - **Run last**

### Alternative Setup

- **`supabase-setup-safe.sql`** - Conservative setup version
  - Same as main setup but with additional safety checks
  - Use if you encounter issues with the main setup

## 🚀 Quick Setup

To set up a fresh Stensyl database:

```sql
-- 1. Run main setup
\i supabase-setup.sql

-- 2. Add social features  
\i enhance-posts-social-fixed.sql

-- 3. Add goals system
\i add-goals-table.sql

-- 4. Add performance scoring
\i add-stensyl-score.sql
```

## 📊 Key Features

### Study Sessions (`posts` table)
- Track study time, subjects, efficiency ratings
- Public/private sharing options
- Notes and session details

### Social Features
- Public study feed with reactions
- User profiles and achievements
- Motivation tracking

### Goals System
- Daily and weekly study targets
- Progress tracking and streaks
- Goal completion analytics

### Performance Index
- Comprehensive scoring algorithm
- Consistency, volume, and focus metrics
- Daily performance tracking

## 🗃️ Archive Directory

The `archive/` directory contains debugging and development files from the delete functionality implementation. These files are preserved for reference but are not needed for normal operation:

- Delete debugging scripts (31 files)
- UUID conversion attempts
- RLS policy fixes
- Temporary test files

## 🔧 Troubleshooting

If you encounter issues:

1. Check that all files are run in the correct order
2. Ensure you have proper Supabase permissions
3. Verify RLS policies are correctly applied
4. Check the archive directory for specific debugging scripts if needed

## 📝 Notes

- All functionality is preserved and working
- Delete operations work correctly with proper RLS policies
- Social features are fully functional
- Performance scoring is active and calculating properly

---

**Last Updated:** June 2025  
**Status:** ✅ All systems operational 