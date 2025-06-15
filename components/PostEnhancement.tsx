import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { stensylColors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface PostEnhancementProps {
  visible: boolean;
  onClose: () => void;
  postData: {
    topic: string;
    subject: string;
    duration: string;
    notes?: string;
    efficiency?: number;
  };
  onComplete: () => void;
}

export const PostEnhancement: React.FC<PostEnhancementProps> = ({
  visible,
  onClose,
  postData,
  onComplete,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [motivationLevel, setMotivationLevel] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email,
          title: title.trim() || null,
          topic: postData.topic,
          subject: postData.subject,
          duration: postData.duration,
          notes: postData.notes || null,
          efficiency: postData.efficiency || null,
          motivation_level: motivationLevel,
          is_public: isPublic,
        });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving study session:', error);
      Alert.alert('Error', 'Failed to save study session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email,
          topic: postData.topic,
          subject: postData.subject,
          duration: postData.duration,
          notes: postData.notes || null,
          efficiency: postData.efficiency || null,
          is_public: false,
        });

      if (error) throw error;

      await new Promise(resolve => setTimeout(resolve, 500));

      onComplete();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving study session:', error);
      Alert.alert('Error', 'Failed to save study session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setIsPublic(false);
    setMotivationLevel(3);
  };

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

  const getMotivationEmoji = (level: number): string => {
    const emojis = ['😴', '😐', '🙂', '😊', '🔥'];
    return emojis[level - 1] || '🙂';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share Your Achievement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={stensylColors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Study Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {formatDuration(postData.duration)} studying {postData.subject}
            </Text>
            {postData.efficiency && (
              <Text style={styles.efficiencyText}>
                {postData.efficiency * 10}% focus
              </Text>
            )}
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Add a title (optional)</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Deep dive into calculus..."
              placeholderTextColor={stensylColors.textMuted}
              maxLength={100}
            />
          </View>

          {/* Motivation Level */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>How motivated do you feel?</Text>
            <View style={styles.motivationContainer}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.motivationButton,
                    motivationLevel === level && styles.motivationButtonActive,
                  ]}
                  onPress={() => setMotivationLevel(level)}
                >
                  <Text style={styles.motivationEmoji}>
                    {getMotivationEmoji(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Public Toggle */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.publicToggle}
              onPress={() => setIsPublic(!isPublic)}
            >
              <View style={styles.publicToggleLeft}>
                <MaterialIcons
                  name={isPublic ? "public" : "lock"}
                  size={20}
                  color={isPublic ? stensylColors.primaryAccent : stensylColors.textMuted}
                />
                <Text style={styles.publicToggleText}>
                  {isPublic ? "Share publicly" : "Keep private"}
                </Text>
              </View>
              <View style={[styles.toggle, isPublic && styles.toggleActive]}>
                <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.publicDescription}>
              {isPublic
                ? "Others can see this achievement and react to it"
                : "Only you can see this study session"
              }
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Text style={styles.skipButtonText}>Save Private</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={stensylColors.textWhite} />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isPublic ? "Share" : "Save"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: stensylColors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: stensylColors.textWhite,
  },
  closeButton: {
    padding: 4,
  },
  summary: {
    backgroundColor: 'rgba(134, 65, 244, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginBottom: 4,
  },
  efficiencyText: {
    fontSize: 14,
    color: stensylColors.primaryAccent,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: stensylColors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: stensylColors.textWhite,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  motivationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  motivationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  motivationButtonActive: {
    backgroundColor: stensylColors.primaryAccent,
  },
  motivationEmoji: {
    fontSize: 24,
  },
  publicToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  publicToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  publicToggleText: {
    fontSize: 16,
    color: stensylColors.textWhite,
    marginLeft: 12,
    fontWeight: '500',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: stensylColors.primaryAccent,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: stensylColors.textWhite,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  publicDescription: {
    fontSize: 14,
    color: stensylColors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: stensylColors.primaryAccent,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
  },
}); 