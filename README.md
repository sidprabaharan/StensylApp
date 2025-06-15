# Stensyl - Study Tracking App 📚

A React Native/Expo study tracking application with social features, goal setting, and performance analytics. Built with Supabase backend.

## ✨ Features

### 📊 Study Tracking
- **Timer & Stopwatch** - Track study sessions with Pomodoro or stopwatch modes
- **Session Logging** - Record subjects, efficiency ratings, and notes
- **Quick Start** - Pre-configured study durations for fast session starts

### 🎯 Goals & Progress
- **Daily/Weekly Goals** - Set study time and session targets
- **Progress Tracking** - Visual progress indicators and streak tracking
- **Performance Index** - Comprehensive scoring based on consistency, volume, and focus

### 🌟 Social Features
- **Public Sharing** - Share study achievements with the community
- **Reactions** - React to others' study sessions with 🔥 and 👏
- **Motivation Tracking** - Track and share motivation levels
- **Privacy Controls** - Choose to keep sessions private or share publicly

### 📈 Analytics
- **Study Streaks** - Track consecutive study days
- **Personal Records** - Longest sessions, most productive days
- **Subject Analytics** - See which subjects you study most
- **Efficiency Insights** - Track focus quality over time

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd Stensyl
   npm install
   ```

2. **Set up Supabase database**
   ```bash
   # Navigate to database directory
   cd database
   
   # Run setup files in order (see database/README.md)
   ```

3. **Configure environment**
   ```bash
   # Create .env file with your Supabase credentials
   cp .env.example .env
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

## 📁 Project Structure

```
Stensyl/
├── app/                    # Main app screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── study.tsx      # Study timer
│   │   ├── social.tsx     # Social feed
│   │   └── profile.tsx    # User profile
│   └── auth/              # Authentication screens
├── components/            # Reusable UI components
├── context/              # React context providers
├── database/             # Database setup and migration files
│   ├── README.md         # Database documentation
│   ├── supabase-setup.sql
│   ├── enhance-posts-social-fixed.sql
│   ├── add-goals-table.sql
│   ├── add-stensyl-score.sql
│   └── archive/          # Debugging files (31 files)
├── lib/                  # Utilities and configurations
└── constants/            # App constants and themes
```

## 🗄️ Database Setup

See `database/README.md` for detailed database setup instructions. The database includes:

- **Study Sessions** - Core tracking functionality
- **Social Features** - Public sharing and reactions
- **Goals System** - Target setting and progress tracking
- **Performance Scoring** - Advanced analytics

## 🎨 Key Components

### Study Timer (`app/(tabs)/study.tsx`)
- Unified study session creation modal
- Collapsible social sharing options
- Direct database integration (no multiple modals)

### Social Feed (`components/SocialFeed.tsx`)
- Real-time study activity feed
- Reaction system with 🔥 and 👏
- User profile integration

### Delete Functionality
- Custom confirmation modals matching Stensyl design
- Proper RLS policies for secure deletion
- Real-time UI updates

## 🔧 Recent Improvements

### ✅ Streamlined UX
- **Single Modal** - Combined study session creation (was 2 separate modals)
- **Optional Social** - Sharing features are now opt-in via collapsible section
- **Quick Save** - "Save Private" and "Save & Share" options

### ✅ Real-time Updates
- **Immediate Visibility** - New study sessions appear instantly
- **Coordinated Refresh** - Home page and social feed sync automatically
- **Database Timing** - Proper commit delays for consistency

### ✅ Clean Architecture
- **Organized Database** - All SQL files moved to `database/` directory
- **Archived Debugging** - 31 debugging files preserved in `archive/`
- **Clear Documentation** - Comprehensive setup guides

## 🛠️ Development

### Available Scripts
```bash
npx expo start          # Start development server
npx expo start --web    # Start web development
npx expo build          # Build for production
npm run lint           # Run ESLint
npm test              # Run tests
```

### Tech Stack
- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Navigation**: Expo Router (file-based)
- **Styling**: StyleSheet with custom theme system
- **State**: React Context + useState/useEffect

## 📱 Platform Support

- ✅ **iOS** - Full native functionality
- ✅ **Android** - Full native functionality  
- ✅ **Web** - Complete web compatibility with platform-specific adaptations

## 🔒 Security

- Row Level Security (RLS) policies for data protection
- User authentication via Supabase Auth
- Secure delete operations with ownership verification
- Privacy controls for study session sharing

## 📄 License

This project is licensed under the MIT License.

---

**Status**: ✅ Production Ready  
**Last Updated**: June 2025  
**Version**: 2.0.0 (Clean Architecture)
