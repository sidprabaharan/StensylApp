import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { stensylColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ActivityCard } from './ActivityCard';
import { ProfileModal } from './ProfileModal';

interface SocialPost {
  id: string;
  user_id: string;
  user_name: string;
  title?: string;
  topic: string;
  subject: string;
  duration: string;
  notes?: string;
  efficiency?: number;
  motivation_level?: number;
  created_at: string;
  fire_count: number;
  clap_count: number;
}

interface SocialFeedProps {
  compact?: boolean;
  maxItems?: number;
  refreshTrigger?: number;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ 
  compact = false, 
  maxItems,
  refreshTrigger
}) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ userId: string; userName: string } | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      console.log('🔍 SOCIAL FEED: Fetching posts...', maxItems ? `(limit: ${maxItems})` : '(no limit)');
      
      const { data, error } = await supabase.rpc('get_social_feed', {
        limit_count: maxItems || 20
      });

      if (error) throw error;
      console.log('🔍 SOCIAL FEED: Fetched posts count:', data?.length || 0);
      console.log('🔍 SOCIAL FEED: Latest post topics:', data?.slice(0, 3).map(p => p.topic) || []);
      setPosts(data || []);
    } catch (err: any) {
      console.error('🔴 SOCIAL FEED: Error fetching social feed:', err);
      setError('Failed to load activity feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Add effect to watch for refresh trigger
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔍 SOCIAL FEED: Refresh triggered by parent');
      fetchPosts();
    }
  }, [refreshTrigger, fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleProfilePress = useCallback((userId: string, userName: string) => {
    setSelectedProfile({ userId, userName });
    setProfileModalVisible(true);
  }, []);

  const handleDeletePost = useCallback((deletedPostId: string) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  }, []);

  const renderPost = ({ item }: { item: SocialPost }) => (
    <ActivityCard
      id={item.id}
      userName={item.user_name || 'Anonymous'}
      title={item.title}
      duration={item.duration}
      subject={item.subject}
      efficiency={item.efficiency}
      motivationLevel={item.motivation_level}
      notes={item.notes}
      timestamp={item.created_at}
      userId={item.user_id}
      fireCount={item.fire_count}
      clapCount={item.clap_count}
      onReactionUpdate={fetchPosts}
      onProfilePress={handleProfilePress}
      onDelete={handleDeletePost}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="people-outline" size={48} color={stensylColors.textMuted} />
      <Text style={styles.emptyTitle}>No activity yet</Text>
      <Text style={styles.emptyText}>
        Study sessions shared publicly will appear here
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (compact) return null;
    
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Activity</Text>
        <Text style={styles.headerSubtitle}>
          See what others are learning
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={stensylColors.primaryAccent} />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialIcons name="error-outline" size={48} color={stensylColors.errorRed} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchPosts} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={stensylColors.primaryAccent}
            colors={[stensylColors.primaryAccent]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : undefined}
        style={compact ? styles.compactList : styles.fullList}
      />
      
      {/* Profile Modal */}
      {selectedProfile && (
        <ProfileModal
          visible={profileModalVisible}
          onClose={() => setProfileModalVisible(false)}
          userId={selectedProfile.userId}
          userName={selectedProfile.userName}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: stensylColors.background,
  },
  compactContainer: {
    maxHeight: 400,
  },
  fullList: {
    flex: 1,
  },
  compactList: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: stensylColors.textWhite,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: stensylColors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: stensylColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: stensylColors.textMuted,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: stensylColors.errorRed,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: stensylColors.primaryAccent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: stensylColors.textWhite,
    fontSize: 16,
    fontWeight: '500',
  },
}); 