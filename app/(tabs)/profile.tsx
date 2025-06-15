import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView, Alert, RefreshControl, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { stensylColors } from '@/constants/Colors';
import { Stack, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { StudyExport } from '@/components/StudyExport';
import { MaterialIcons } from '@expo/vector-icons';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

// Local type definition for Posts, matching the data structure
interface Post {
  id: string;
  user_id: string;
  user_name: string | null;
  created_at: string;
  topic: string;
  subject: string;
  duration: string;
  notes: string | null;
  mode: string | null;
  efficiency: number | null;
}

// Helper to parse HH:MM:SS string to seconds
const parseDuration = (duration: string): number => {
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// Helper to format total seconds into a readable string
const formatTotalTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

// Calculate study streak
const calculateStudyStreak = (posts: Post[]): number => {
  if (posts.length === 0) return 0;

  const studyDates = [
    ...new Set(
      posts.map((post) => new Date(post.created_at).toISOString().split('T')[0])
    ),
  ].sort((a, b) => b.localeCompare(a));

  if (studyDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstStudyDate = new Date(studyDates[0]);
  firstStudyDate.setHours(0, 0, 0, 0);

  const diffFromToday = (today.getTime() - firstStudyDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffFromToday > 1) {
    return 0;
  }

  streak = 1;
  for (let i = 0; i < studyDates.length - 1; i++) {
    const currentDay = new Date(studyDates[i]);
    const nextDay = new Date(studyDates[i + 1]);
    const diffTime = currentDay.getTime() - nextDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

// Calculate personal records
const calculatePersonalRecords = (posts: Post[]) => {
  if (posts.length === 0) {
    return {
      longestSession: 0,
      mostProductiveDay: 0,
      favoriteSubject: 'None',
      bestEfficiencyStreak: 0,
    };
  }

  // Longest single session
  const longestSession = Math.max(...posts.map(post => parseDuration(post.duration)));

  // Most productive day (total minutes in a single day)
  const dailyTotals: { [key: string]: number } = {};
  posts.forEach(post => {
    const date = new Date(post.created_at).toISOString().split('T')[0];
    dailyTotals[date] = (dailyTotals[date] || 0) + parseDuration(post.duration);
  });
  const mostProductiveDay = Math.max(...Object.values(dailyTotals));

  // Favorite subject (most time spent)
  const subjectTotals: { [key: string]: number } = {};
  posts.forEach(post => {
    subjectTotals[post.subject] = (subjectTotals[post.subject] || 0) + parseDuration(post.duration);
  });
  const favoriteSubject = Object.keys(subjectTotals).reduce((a, b) => 
    subjectTotals[a] > subjectTotals[b] ? a : b, 'None'
  );

  // Best efficiency streak (consecutive sessions with efficiency >= 8)
  let bestEfficiencyStreak = 0;
  let currentEfficiencyStreak = 0;
  posts.forEach(post => {
    if (post.efficiency && post.efficiency >= 8) {
      currentEfficiencyStreak++;
      bestEfficiencyStreak = Math.max(bestEfficiencyStreak, currentEfficiencyStreak);
    } else {
      currentEfficiencyStreak = 0;
    }
  });

  return {
    longestSession,
    mostProductiveDay,
    favoriteSubject,
    bestEfficiencyStreak,
  };
};

// Get study personality insight
const getStudyPersonality = (posts: Post[]): string => {
  if (posts.length === 0) return "Ready to start your study journey! 🚀";
  
  const morningStudies = posts.filter(post => {
    const hour = new Date(post.created_at).getHours();
    return hour >= 6 && hour < 12;
  }).length;
  
  const eveningStudies = posts.filter(post => {
    const hour = new Date(post.created_at).getHours();
    return hour >= 18 && hour < 24;
  }).length;
  
  const avgEfficiency = posts.filter(p => p.efficiency).length > 0 
    ? posts.filter(p => p.efficiency).reduce((sum, p) => sum + (p.efficiency || 0), 0) / posts.filter(p => p.efficiency).length
    : 0;

  const streak = calculateStudyStreak(posts);
  
  if (streak >= 7) return "Consistency Champion! 🏆";
  if (avgEfficiency >= 8) return "Focus Master! 🎯";
  if (morningStudies > eveningStudies) return "Early Bird Learner! 🌅";
  if (eveningStudies > morningStudies) return "Night Owl Scholar! 🦉";
  return "Dedicated Student! 📚";
};

const PersonalRecordCard = ({ icon, label, value, color }: { 
  icon: string; 
  label: string; 
  value: string; 
  color: string;
}) => (
  <View style={styles.recordCard}>
    <MaterialIcons name={icon as any} size={24} color={color} />
    <Text style={styles.recordValue}>{value}</Text>
    <Text style={styles.recordLabel}>{label}</Text>
  </View>
);

const RecentActivityItem = ({ post, onDelete }: { post: Post; onDelete?: (id: string) => void }) => {
  const { user } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  const handleDeletePress = async () => {
    console.log('🔴 PROFILE DELETE PRESSED - Starting delete process...');
    console.log('🔍 Post ID:', post.id);
    console.log('🔍 Post user_id:', post.user_id);
    console.log('🔍 Current user:', user?.id);
    console.log('🔍 User match:', user?.id === post.user_id);
    console.log('🔍 Platform:', Platform.OS);
    
    // Show custom confirmation modal (works on both web and mobile)
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    console.log('🔴 User confirmed delete, executing...');
    setDeleteModalVisible(false);
    performProfileDelete();
  };

  const handleCancelDelete = () => {
    console.log('🔍 Delete cancelled by user');
    setDeleteModalVisible(false);
  };

  const performProfileDelete = async () => {
    try {
      console.log('🔍 Attempting delete with user_id check...');
      console.log('🔍 Post to delete:', { id: post.id, topic: post.topic, user_id: post.user_id });
      console.log('🔍 Current user:', { id: user?.id, email: user?.email });
      
      // First, let's check the current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Current session:', sessionData?.session?.user?.id);
      console.log('🔍 Session error:', sessionError);
      
      // Check if user is authenticated
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('🔍 Current user from getUser():', userData?.user?.id);
      console.log('🔍 User error:', userError);
      
      console.log('🔍 About to execute delete query...');
      const deleteResult = await supabase
        .from('posts')
        .delete({ count: 'exact' })
        .eq('id', post.id)
        .eq('user_id', user?.id);
        
      console.log('🔍 Delete operation completed');
      console.log('🔍 Delete result:', deleteResult);
      console.log('🔍 Delete response data:', deleteResult.data);
      console.log('🔍 Delete response error:', deleteResult.error);
      console.log('🔍 Delete response count:', deleteResult.count);
      
      const { error, data, count } = deleteResult;
        
      if (error) {
        console.error('🔴 Delete error:', error);
        Alert.alert('Delete Error', error.message);
        return;
      }

      if (count === 0) {
        console.log('🔍 No rows deleted - post may not exist or belong to another user');
        Alert.alert('Delete Failed', 'Could not delete this session. It may have already been deleted.');
        return;
      }
      
      console.log('🟢 Post deleted successfully from database');
      console.log('🔍 Deleted post ID:', post.id);
      console.log('🔍 Deleted post topic:', post.topic);
      console.log('🔍 Calling onDelete callback with post ID:', post.id);
      if (onDelete) {
        onDelete(post.id);
      } else {
        console.log('🔴 WARNING: onDelete callback is undefined!');
      }
    } catch (e: any) {
      console.error('🔴 Delete failed with exception:', e);
      Alert.alert('Delete Failed', e.message || 'Unable to delete session. Please try again.');
    }
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIcon}>
        <MaterialIcons name="school" size={20} color={stensylColors.primaryAccent} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{post.topic}</Text>
        <Text style={styles.activitySubject}>{post.subject}</Text>
        <Text style={styles.activityTime}>
          {formatTotalTime(parseDuration(post.duration))} • {new Date(post.created_at).toLocaleDateString()}
        </Text>
      </View>
      {post.efficiency && (
        <View style={styles.efficiencyBadge}>
          <Text style={styles.efficiencyText}>{post.efficiency}/10</Text>
        </View>
      )}
      {/* Delete button - only show for user's own posts */}
      {user && user.id === post.user_id && (
        <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
          <MaterialIcons name="delete-outline" size={20} color={stensylColors.errorRed} />
        </TouchableOpacity>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Study Session"
        message={`Are you sure you want to permanently delete this ${post.topic} session? This action cannot be undone.`}
      />
    </View>
  );
};

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const fetchUserPosts = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    console.log('🔍 PROFILE: Fetching user posts...', isRefresh ? '(refresh)' : '(initial)');
    if (!isRefresh) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('🔍 PROFILE: Fetched posts count:', data?.length || 0);
      console.log('🔍 PROFILE: Post IDs:', data?.map(p => p.id) || []);
      console.log('🔍 PROFILE: Post topics:', data?.map(p => p.topic) || []);
      setPosts(data || []);
    } catch (error: any) {
      console.error('🔴 PROFILE: Error fetching posts:', error);
      Alert.alert('Error fetching profile data', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserPosts(true);
  }, [fetchUserPosts]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔍 PROFILE: Screen focused, refreshing data...');
      // Clear posts first to force a fresh load
      setPosts([]);
      fetchUserPosts();
    }, [fetchUserPosts])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert('Sign Out Failed', error.message);
    }
  };

  const handleDeletePost = (deletedPostId: string) => {
    console.log('🔍 Updating UI - removing post from state:', deletedPostId);
    setPosts(prevPosts => {
      const filteredPosts = prevPosts.filter(post => post.id !== deletedPostId);
      console.log('🔍 Posts before filter:', prevPosts.length);
      console.log('🔍 Posts after filter:', filteredPosts.length);
      console.log('🔍 Remaining post IDs:', filteredPosts.map(p => p.id));
      return filteredPosts;
    });
    
    // Force a refresh from database after a short delay to ensure consistency
    setTimeout(() => {
      console.log('🔍 Force refreshing profile data after delete...');
      fetchUserPosts(true);
    }, 1000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={stensylColors.primaryAccent} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSessions = posts.length;
  const totalSecondsStudied = posts.reduce((acc, post) => acc + parseDuration(post.duration), 0);
  const studyStreak = calculateStudyStreak(posts);
  const personalRecords = calculatePersonalRecords(posts);
  const studyPersonality = getStudyPersonality(posts);
  const recentPosts = posts.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: '',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={() => setExportModalVisible(true)} 
                style={styles.shareButton}
              >
                <MaterialIcons name="share" size={20} color={stensylColors.primaryAccent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={stensylColors.primaryAccent}
            colors={[stensylColors.primaryAccent]}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={40} color={stensylColors.textWhite} />
            </View>
            <Text style={styles.userName}>{user?.user_metadata?.full_name || 'Study Champion'}</Text>
            <Text style={styles.studyPersonality}>{studyPersonality}</Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{formatTotalTime(totalSecondsStudied)}</Text>
              <Text style={styles.quickStatLabel}>Total Time</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{totalSessions}</Text>
              <Text style={styles.quickStatLabel}>Sessions</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{studyStreak}</Text>
              <Text style={styles.quickStatLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.recordsGrid}>
            <PersonalRecordCard
              icon="timer"
              label="Longest Session"
              value={formatTotalTime(personalRecords.longestSession)}
              color="#E63946"
            />
            <PersonalRecordCard
              icon="trending-up"
              label="Best Day"
              value={formatTotalTime(personalRecords.mostProductiveDay)}
              color="#2a9d8f"
            />
            <PersonalRecordCard
              icon="school"
              label="Top Subject"
              value={personalRecords.favoriteSubject}
              color="#e9c46a"
            />
            <PersonalRecordCard
              icon="psychology"
              label="Focus Streak"
              value={`${personalRecords.bestEfficiencyStreak} sessions`}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentPosts.length > 0 ? (
            <View style={styles.activityList} key={`activity-${posts.length}-${Date.now()}`}>
              {recentPosts.map((post) => (
                <RecentActivityItem key={`${post.id}-${post.created_at}`} post={post} onDelete={handleDeletePost} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={48} color={stensylColors.textMuted} />
              <Text style={styles.emptyStateText}>No study sessions yet</Text>
              <Text style={styles.emptyStateSubtext}>Start studying to see your activity here!</Text>
            </View>
          )}
        </View>

        {/* Account Info */}
        <View style={styles.accountSection}>
          <Text style={styles.accountInfo}>Signed in as: {user?.email}</Text>
        </View>
      </ScrollView>

      {/* Export/Share Modal */}
      <StudyExport
        posts={posts}
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stensylColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: stensylColors.textMuted,
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  shareButton: {
    padding: 8,
    marginRight: 8,
  },
  signOutButton: {
    padding: 8,
  },
  signOutButtonText: {
    color: stensylColors.primaryAccent,
    fontSize: 16,
  },

  // Hero Section
  heroSection: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: stensylColors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: stensylColors.textWhite,
    marginBottom: 4,
  },
  studyPersonality: {
    fontSize: 16,
    color: stensylColors.primaryAccent,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 16,
    paddingVertical: 20,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: stensylColors.textWhite,
  },
  quickStatLabel: {
    fontSize: 12,
    color: stensylColors.textMuted,
    marginTop: 4,
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginBottom: 16,
  },

  // Personal Records
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recordCard: {
    width: '48%',
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: stensylColors.textWhite,
    marginTop: 8,
    textAlign: 'center',
  },
  recordLabel: {
    fontSize: 12,
    color: stensylColors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Recent Activity
  activityList: {
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: stensylColors.inputBackground,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: stensylColors.primaryAccent + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginBottom: 2,
  },
  activitySubject: {
    fontSize: 14,
    color: stensylColors.primaryAccent,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: stensylColors.textMuted,
  },
  efficiencyBadge: {
    backgroundColor: stensylColors.primaryAccent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  efficiencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: stensylColors.textWhite,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: stensylColors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  // Account Section
  accountSection: {
    paddingBottom: 32,
  },
  accountInfo: {
    fontSize: 14,
    color: stensylColors.textMuted,
    textAlign: 'center',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4,
  },

}); 