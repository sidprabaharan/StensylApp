import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { stensylColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ActivityCardProps {
  id: string;
  userName: string;
  title?: string;
  duration: string;
  subject: string;
  efficiency?: number;
  motivationLevel?: number;
  notes?: string;
  timestamp: string;
  userId: string;
  fireCount: number;
  clapCount: number;
  userStensylScore?: number;
  userStreak?: number;
  onReactionUpdate?: () => void;
  onProfilePress?: (userId: string, userName: string) => void;
  onDelete?: (id: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  id,
  userName,
  title,
  duration,
  subject,
  efficiency,
  motivationLevel,
  notes,
  timestamp,
  userId,
  fireCount: initialFireCount,
  clapCount: initialClapCount,
  userStensylScore,
  userStreak,
  onReactionUpdate,
  onProfilePress,
  onDelete,
}) => {
  const { user } = useAuth();
  const [fireCount, setFireCount] = useState(initialFireCount);
  const [clapCount, setClapCount] = useState(initialClapCount);
  const [isReacting, setIsReacting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Parse duration for display
  const formatDuration = (duration: string): string => {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
    return duration;
  };

  // Format timestamp for display
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle reaction toggle
  const handleReaction = async (reactionType: 'fire' | 'clap') => {
    if (!user || isReacting) return;

    setIsReacting(true);
    try {
      const { data, error } = await supabase.rpc('toggle_reaction', {
        post_uuid: id,
        reaction_type_param: reactionType,
      });

      if (error) throw error;

      // Update local counts based on whether reaction was added or removed
      if (reactionType === 'fire') {
        setFireCount(prev => data ? prev + 1 : prev - 1);
      } else {
        setClapCount(prev => data ? prev + 1 : prev - 1);
      }

      onReactionUpdate?.();
    } catch (error: any) {
      console.error('Reaction error:', error);
      Alert.alert('Error', 'Failed to react. Please try again.');
    } finally {
      setIsReacting(false);
    }
  };

  const handleDeletePress = async () => {
    console.log('🔴 ACTIVITY CARD DELETE PRESSED - Starting delete process...');
    console.log('🔍 Post ID:', id);
    console.log('🔍 Post userId:', userId);
    console.log('🔍 Current user:', user?.id);
    console.log('🔍 User match:', user?.id === userId);
    console.log('🔍 Platform:', Platform.OS);
    
    // Show custom confirmation modal (works on both web and mobile)
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = () => {
    console.log('🔴 User confirmed delete, executing...');
    setDeleteModalVisible(false);
    performDelete();
  };

  const handleCancelDelete = () => {
    console.log('🔍 Delete cancelled by user');
    setDeleteModalVisible(false);
  };

  const performDelete = async () => {
    try {
      console.log('🔍 Attempting delete with user_id check...');
      console.log('🔍 Post to delete:', { id, userId, title: title || 'Study Session' });
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
        .eq('id', id)
        .eq('user_id', user?.id);
        
      console.log('🔍 Delete operation completed');
      console.log('🔍 Delete result:', deleteResult);
      console.log('🔍 Delete response data:', deleteResult.data);
      console.log('🔍 Delete response error:', deleteResult.error);
      console.log('🔍 Delete response count:', deleteResult.count);
      
      const { error, data, count } = deleteResult;
        
      if (error) {
        console.error('🔴 Delete error:', error);
        Alert.alert('Delete Error', `Database error: ${error.message}`);
        return;
      }

      if (count === 0) {
        console.log('🔍 No rows deleted - post may not exist or belong to another user');
        Alert.alert('Delete Failed', 'Could not delete this session. It may have already been deleted.');
        return;
      }
      
      console.log('🟢 Post deleted successfully from database');
      console.log('🔍 Deleted post ID:', id);
      console.log('🔍 Deleted post title:', title || 'Study Session');
      
      // Update UI
      if (onDelete) {
        console.log('🔍 Calling onDelete callback with post ID:', id);
        onDelete(id);
      } else {
        console.log('🔴 WARNING: onDelete callback is undefined!');
      }
      
      // Refresh feed
      if (onReactionUpdate) {
        console.log('🔍 Calling onReactionUpdate to refresh feed...');
        onReactionUpdate();
      }
      
    } catch (e: any) {
      console.error('🔴 Delete failed with exception:', e);
      Alert.alert('Delete Failed', `Error: ${e.message || 'Unknown error'}`);
    }
  };

  // Get efficiency indicator
  const getEfficiencyColor = (eff?: number): string => {
    if (!eff) return stensylColors.textMuted;
    if (eff >= 8) return '#10B981'; // Green
    if (eff >= 6) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <View style={styles.card}>
      {/* Header with delete button */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {title || 'Study Session'}
        </Text>
        {/* Delete button - only show for user's own posts */}
        {user && user.id === userId && (
          <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
            <MaterialIcons name="delete-outline" size={20} color={stensylColors.errorRed} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Study Metrics */}
        <View style={styles.metrics}>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          <View style={styles.separator} />
          <Text style={styles.subject}>{subject}</Text>
          {efficiency && (
            <>
              <View style={styles.separator} />
              <View style={styles.efficiencyContainer}>
                <Text style={[styles.efficiency, { color: getEfficiencyColor(efficiency) }]}>
                  {efficiency * 10}% focus
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Notes (if provided) */}
        {notes && (
          <Text style={styles.notes} numberOfLines={2}>
            "{notes}"
          </Text>
        )}
      </View>

      {/* User Info & Reactions Footer */}
      <View style={styles.footer}>
        <View style={styles.userInfo}>
          <TouchableOpacity 
            onPress={() => onProfilePress?.(userId, userName)}
            style={styles.userNameContainer}
          >
            <Text style={styles.userName}>{userName}</Text>
          </TouchableOpacity>
          {userStensylScore && (
            <Text style={styles.userStats}>Score {userStensylScore}</Text>
          )}
          {userStreak && (
            <Text style={styles.userStats}>{userStreak}-day streak</Text>
          )}
          <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
        </View>

        {/* Reactions */}
        <View style={styles.reactions}>
          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReaction('fire')}
            disabled={isReacting}
          >
            <Text style={styles.reactionEmoji}>🔥</Text>
            <Text style={styles.reactionCount}>{fireCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reactionButton}
            onPress={() => handleReaction('clap')}
            disabled={isReacting}
          >
            <Text style={styles.reactionEmoji}>👏</Text>
            <Text style={styles.reactionCount}>{clapCount}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        title="Delete Study Session"
        message={`Are you sure you want to permanently delete this ${title || 'study session'}? This action cannot be undone.`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    marginBottom: 16,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.primaryAccent,
  },
  separator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: stensylColors.textMuted,
    marginHorizontal: 8,
  },
  subject: {
    fontSize: 14,
    color: stensylColors.textWhite,
    fontWeight: '500',
  },
  efficiencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  efficiency: {
    fontSize: 14,
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    color: stensylColors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  userNameContainer: {
    // Add slight padding for better touch target
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: stensylColors.primaryAccent,
    marginBottom: 2,
  },
  userStats: {
    fontSize: 12,
    color: stensylColors.textMuted,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: stensylColors.textMuted,
    marginTop: 4,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 50,
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 14,
    fontWeight: '500',
    color: stensylColors.textWhite,
  },
}); 