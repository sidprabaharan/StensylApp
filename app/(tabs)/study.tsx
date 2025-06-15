import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router'; // Href might be needed if router.push is used with typed routes
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  ScrollView as ModalScrollView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { stensylColors } from '@/constants/Colors'; // Adjusted import path
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'; // Added import
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { supabase } from '@/lib/supabase'; // Import Supabase client
import { GoalProgress } from '@/components/GoalProgress';


// Helper function to format time (always HH:MM:SS if hours > 0 for stopwatch)
const formatStopwatchTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hh}:${mm}:${ss}`;
  return `00:${mm}:${ss}`;
};

// Helper function to format Pomodoro time (MM:SS)
const formatPomodoroTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
};

const DEFAULT_POMODORO_BREAK_DURATION = 5 * 60;
const DEFAULT_POMODORO_STUDY_DURATION = 25 * 60;

type TimerMode = 'Stopwatch' | 'Pomodoro';
type PomodoroPhase = 'Study' | 'Break';

const pomodoroDurationOptions = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const pomodoroBreakOptions = [5, 10, 15, 20, 25, 30];

// Replace quick start preset options with duration-only options
const quickStartDurations = [15, 25, 45, 90]; // in minutes

const StudyTrackerScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight(); // Get tab bar height
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  const [timerMode, setTimerMode] = useState<TimerMode>('Stopwatch');
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('Study');
  const [customStudyDuration, setCustomStudyDuration] = useState(DEFAULT_POMODORO_STUDY_DURATION);
  const [customBreakDuration, setCustomBreakDuration] = useState(DEFAULT_POMODORO_BREAK_DURATION);
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(customStudyDuration);
  const [isDurationPickerVisible, setIsDurationPickerVisible] = useState(false);
  const [durationType, setDurationType] = useState<'study' | 'break'>('study');

  const [isEndSessionModalVisible, setIsEndSessionModalVisible] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [subjectStudied, setSubjectStudied] = useState('');
  const [efficiencyScore, setEfficiencyScore] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');

  const [loading, setLoading] = useState(false);

  // Add social features state
  const [postTitle, setPostTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [motivationLevel, setMotivationLevel] = useState(3);
  const [showSocialOptions, setShowSocialOptions] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const resetPomodoro = useCallback((startPhase: PomodoroPhase = 'Study') => {
    setIsTimerActive(false);
    setPomodoroPhase(startPhase);
    setPomodoroSecondsLeft(startPhase === 'Study' ? customStudyDuration : customBreakDuration);
  }, [customStudyDuration, customBreakDuration]);

  useEffect(() => {
    if (isTimerActive) {
      intervalRef.current = setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
        if (timerMode === 'Pomodoro') {
          setPomodoroSecondsLeft((prevSeconds) => {
            if (prevSeconds <= 1) {
              if (pomodoroPhase === 'Study') {
                setPomodoroPhase('Break'); return customBreakDuration;
              } else {
                setPomodoroPhase('Study'); return customStudyDuration;
              }
            }
            return prevSeconds - 1;
          });
        }
      }, 1000) as unknown as number;
    } else if (!isTimerActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTimerActive, timerMode, pomodoroPhase, customStudyDuration]);

  const toggleTimer = () => {
    setIsTimerActive(!isTimerActive);
    if (!isTimerActive && timerMode === 'Pomodoro') {
      if (pomodoroSecondsLeft === 0) {
        const nextPhase = pomodoroPhase === 'Study' ? 'Break' : 'Study';
        setPomodoroPhase(nextPhase);
        setPomodoroSecondsLeft(nextPhase === 'Study' ? customStudyDuration : customBreakDuration);
      }
    }
  };

  const handleEndSessionPress = () => {
    if (isTimerActive) setIsTimerActive(false);
    if (stopwatchSeconds === 0 && (timerMode === 'Stopwatch' || (timerMode === 'Pomodoro' && customStudyDuration === pomodoroSecondsLeft))) {
        Alert.alert("No Time Tracked", "Please start a study session before ending it.");
        return;
    }
    setIsEndSessionModalVisible(true);
  };

  const handleSaveSession = async (saveAsPublic = false) => {
    if (!sessionName.trim() || !subjectStudied.trim()) {
      Alert.alert("Missing Information", "Please enter both session name and subject.");
      return;
    }
    const score = parseInt(efficiencyScore, 10);
    if (efficiencyScore.trim() && (isNaN(score) || score < 1 || score > 10)) {
        Alert.alert("Invalid Score", "Efficiency score must be a number between 1 and 10.");
        return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to save a session.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email,
          title: postTitle.trim() || null,
          topic: sessionName.trim(),
          subject: subjectStudied.trim(),
          duration: formatStopwatchTime(stopwatchSeconds),
          notes: sessionDescription.trim() || null,
          efficiency: efficiencyScore.trim() ? score : null,
          motivation_level: saveAsPublic ? motivationLevel : null,
          is_public: saveAsPublic,
        });

      if (error) throw error;

      // Add small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reset everything after successful post
      setStopwatchSeconds(0);
      resetPomodoro('Study');
      resetForm();
      setIsEndSessionModalVisible(false);
      
      console.log('🔍 STUDY: Session saved, navigating to home page...');
      router.push('/(tabs)');
    } catch (error: any) {
      console.error('Error saving study session:', error);
      Alert.alert('Error', 'Failed to save study session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSessionName('');
    setSubjectStudied('');
    setEfficiencyScore('');
    setSessionDescription('');
    setPostTitle('');
    setIsPublic(false);
    setMotivationLevel(3);
    setShowSocialOptions(false);
  };

  const handleSavePrivate = () => handleSaveSession(false);
  const handleSavePublic = () => handleSaveSession(true);

  const getMotivationEmoji = (level: number): string => {
    const emojis = ['😴', '😐', '🙂', '😊', '🔥'];
    return emojis[level - 1] || '🙂';
  };



  const handleCancelSave = () => setIsEndSessionModalVisible(false);

  const toggleMode = () => {
    setIsTimerActive(false);
    if (timerMode === 'Stopwatch') {
      setTimerMode('Pomodoro'); resetPomodoro('Study');
    } else {
      setTimerMode('Stopwatch');
      // setStopwatchSeconds(0); // Optionally reset stopwatch time when switching to it
    }
  };

  const handleDurationSelect = (durationMinutes: number) => {
    const newDurationSeconds = durationMinutes * 60;
    
    if (durationType === 'study') {
      setCustomStudyDuration(newDurationSeconds);
      if (pomodoroPhase === 'Study') setPomodoroSecondsLeft(newDurationSeconds);
    } else {
      setCustomBreakDuration(newDurationSeconds);
      if (pomodoroPhase === 'Break') setPomodoroSecondsLeft(newDurationSeconds);
    }
    
    setIsTimerActive(false);
    setIsDurationPickerVisible(false);
  };

  const handleQuickStart = (durationMinutes: number) => {
    if (timerMode === 'Pomodoro') {
      const newDurationSeconds = durationMinutes * 60;
      setCustomStudyDuration(newDurationSeconds);
      setPomodoroSecondsLeft(newDurationSeconds);
      resetPomodoro('Study');
    }
    
    // Auto-start the timer
    setIsTimerActive(true);
  };

  // const handleAdvancedStatsPress = () => {
  //   console.log("Advanced Statistics button pressed!");
  //   // router.push('/advancedstats' as Href);
  // };

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen
        options={{
          title: 'Study Tracker',
          // Header styling will be primarily controlled by app/(tabs)/_layout.tsx
        }}
      />

      {/* Display total stopwatch time in Pomodoro mode */}
      {timerMode === 'Pomodoro' && (
        <View style={styles.topRightStopwatchContainer}>
          <Text style={styles.topRightStopwatchText}>{formatStopwatchTime(stopwatchSeconds)}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0} // Optional: adjust KAV offset too
      >
        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.modeToggleContainer}>
            <Text style={[styles.modeLabel, timerMode === 'Stopwatch' && styles.modeLabelActive]}>Stopwatch</Text>
            <Switch
              trackColor={{ false: stensylColors.toggleInactive, true: stensylColors.toggleActive }}
              thumbColor={stensylColors.textWhite}
              ios_backgroundColor={stensylColors.toggleInactive}
              onValueChange={toggleMode}
              value={timerMode === 'Pomodoro'}
            />
            <Text style={[styles.modeLabel, timerMode === 'Pomodoro' && styles.modeLabelActive]}>Pomodoro</Text>
          </View>

          {/* Goal Progress Display */}
          <View style={styles.goalProgressContainer}>
            <GoalProgress compact={true} />
          </View>

          {timerMode === 'Pomodoro' && (
            <View style={styles.durationControlsContainer}>
              <TouchableOpacity 
                onPress={() => {
                  setDurationType('study');
                  setIsDurationPickerVisible(true);
                }} 
                style={styles.durationDisplayTouchable}
              >
                <Text style={styles.durationDisplayText}>
                  {`${customStudyDuration / 60} min Study`}
                </Text>
                <MaterialIcons name="edit" size={16} color={stensylColors.textMuted} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
              <Text style={styles.durationSeparator}>/</Text>
              <TouchableOpacity 
                onPress={() => {
                  setDurationType('break');
                  setIsDurationPickerVisible(true);
                }} 
                style={styles.durationDisplayTouchable}
              >
                <Text style={styles.durationDisplayText}>
                  {`${customBreakDuration / 60} min Break`}
                </Text>
                <MaterialIcons name="edit" size={16} color={stensylColors.textMuted} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Start Buttons */}
          {!isTimerActive && stopwatchSeconds === 0 && (
            <View style={styles.quickStartContainer}>
              <Text style={styles.quickStartTitle}>Quick Timer</Text>
              <View style={styles.quickStartGrid}>
                {quickStartDurations.map((durationMinutes, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickStartButton}
                    onPress={() => handleQuickStart(durationMinutes)}
                  >
                    <Text style={styles.quickStartButtonText}>{durationMinutes}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {timerMode === 'Stopwatch' && (
            <View style={styles.timerDisplayContainer}>
              <Text style={styles.timerText}>{formatStopwatchTime(stopwatchSeconds)}</Text>
            </View>
          )}

          {timerMode === 'Pomodoro' && (
            <View style={styles.timerDisplayContainer}>
              <Text style={styles.pomodoroPhaseText}>{pomodoroPhase === 'Study' ? 'Study Time' : 'Break Time!'}</Text>
              <Text style={styles.timerText}>{formatPomodoroTime(pomodoroSecondsLeft)}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.playPauseButton} onPress={toggleTimer}>
            <MaterialIcons
              name={isTimerActive ? "pause-circle-filled" : "play-circle-filled"}
              size={80}
              color={stensylColors.primaryAccent}
            />
          </TouchableOpacity>
        </ScrollView>

        <View style={[styles.endSessionButtonContainer, { paddingBottom: (Platform.OS === 'ios' ? 30 : 20) + tabBarHeight }]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.endButton,
              (stopwatchSeconds === 0 &&
                (timerMode === 'Stopwatch' || (timerMode === 'Pomodoro' && customStudyDuration === pomodoroSecondsLeft))) &&
                styles.disabledButtonState,
            ]}
            onPress={handleEndSessionPress}
            disabled={
              stopwatchSeconds === 0 &&
              (timerMode === 'Stopwatch' || (timerMode === 'Pomodoro' && customStudyDuration === pomodoroSecondsLeft))
            }
          >
            <Text style={styles.actionButtonText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* End Session Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEndSessionModalVisible}
        onRequestClose={handleCancelSave}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOuterKAV}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save Study Session</Text>
              <Text style={styles.modalDurationText}>Total Duration: {formatStopwatchTime(stopwatchSeconds)}</Text>
              <ModalScrollView style={styles.modalInputsScrollView} contentContainerStyle={styles.modalInputsScrollContent}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Name of the session (e.g., Midterm Prep Ch. 3)"
                  placeholderTextColor={stensylColors.textMuted}
                  value={sessionName}
                  onChangeText={setSessionName}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Subject studied (e.g., Calculus II)"
                  placeholderTextColor={stensylColors.textMuted}
                  value={subjectStudied}
                  onChangeText={setSubjectStudied}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Efficiency Score (1-10, Optional)"
                  placeholderTextColor={stensylColors.textMuted}
                  value={efficiencyScore}
                  onChangeText={setEfficiencyScore}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <TextInput
                  style={[styles.modalInput, styles.modalDescriptionInput]}
                  placeholder="Optional: What did you work on?"
                  placeholderTextColor={stensylColors.textMuted}
                  value={sessionDescription}
                  onChangeText={setSessionDescription}
                  multiline={true}
                  numberOfLines={3}
                />

                {/* Social Features Toggle */}
                <TouchableOpacity 
                  style={styles.socialToggleButton}
                  onPress={() => setShowSocialOptions(!showSocialOptions)}
                >
                  <Text style={styles.socialToggleText}>
                    {showSocialOptions ? 'Hide' : 'Show'} Sharing Options
                  </Text>
                  <MaterialIcons 
                    name={showSocialOptions ? "expand-less" : "expand-more"} 
                    size={20} 
                    color={stensylColors.primaryAccent} 
                  />
                </TouchableOpacity>

                {/* Collapsible Social Options */}
                {showSocialOptions && (
                  <View style={styles.socialOptionsContainer}>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Optional: Add a title for sharing"
                      placeholderTextColor={stensylColors.textMuted}
                      value={postTitle}
                      onChangeText={setPostTitle}
                      maxLength={100}
                    />

                    <View style={styles.motivationSection}>
                      <Text style={styles.motivationLabel}>How motivated do you feel?</Text>
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
                  </View>
                )}
              </ModalScrollView>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCancelSave}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, loading && styles.disabledButtonState]}
                  onPress={handleSavePrivate}
                  disabled={loading}
                >
                  <Text style={styles.modalButtonText}>{loading ? 'Saving...' : 'Save Private'}</Text>
                </TouchableOpacity>
                {showSocialOptions && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.shareButton, loading && styles.disabledButtonState]}
                    onPress={handleSavePublic}
                    disabled={loading}
                  >
                    <Text style={styles.modalButtonText}>{loading ? 'Saving...' : 'Save & Share'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pomodoro Duration Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDurationPickerVisible}
        onRequestClose={() => setIsDurationPickerVisible(false)}
      >
        <TouchableOpacity style={styles.modalPickerOverlay} activeOpacity={1} onPressOut={() => setIsDurationPickerVisible(false)}>
          <View style={styles.durationPickerModalContent}>
            <Text style={styles.modalTitle}>
              Select {durationType === 'study' ? 'Study' : 'Break'} Duration
            </Text>
            <ModalScrollView>
              {(durationType === 'study' ? pomodoroDurationOptions : pomodoroBreakOptions).map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.durationOptionButton,
                    (durationType === 'study' ? customStudyDuration : customBreakDuration) === minutes * 60 && styles.durationOptionSelected,
                  ]}
                  onPress={() => handleDurationSelect(minutes)}
                >
                  <Text style={styles.durationOptionText}>{minutes} minutes</Text>
                </TouchableOpacity>
              ))}
            </ModalScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { marginTop: 10, width: '100%' }]}
              onPress={() => setIsDurationPickerVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


    </View>
  );
};

const pageHorizontalPadding = 16;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: stensylColors.background,
  },
  topRightStopwatchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 10, // Consider safe area views or header height
    right: pageHorizontalPadding,
    backgroundColor: stensylColors.cardBackground,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, zIndex: 10,
  },
  topRightStopwatchText: {
    color: stensylColors.textWhite, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'],
  },
  keyboardAvoidingContainer: { flex: 1 },
  scrollContentContainer: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    padding: pageHorizontalPadding,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modeToggleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modeLabel: { fontSize: 16, color: stensylColors.textMuted, marginHorizontal: 10 },
  modeLabelActive: { color: stensylColors.primaryAccent, fontWeight: 'bold' },
  
  goalProgressContainer: {
    width: '100%',
    marginBottom: 20,
  },

  durationControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  durationDisplayTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: stensylColors.inputBackground,
    borderRadius: 8,
  },
  durationDisplayText: {
    color: stensylColors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  durationSeparator: {
    color: stensylColors.textMuted,
    fontSize: 14,
    marginHorizontal: 8,
  },

  quickStartContainer: {
    width: '100%',
    marginBottom: 20,
  },
  quickStartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: stensylColors.textWhite,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickStartGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  quickStartButton: {
    flex: 1,
    height: 40,
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: stensylColors.inputBackground,
  },
  quickStartButtonText: {
    color: stensylColors.textWhite,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  timerDisplayContainer: {
    marginBottom: 30,
    paddingHorizontal: 20, paddingVertical: 15,
    backgroundColor: stensylColors.cardBackground, borderRadius: 20,
    minWidth: '85%', alignItems: 'center',
  },
  timerText: {
    fontSize: 64, fontWeight: 'bold', color: stensylColors.textWhite,
    fontVariant: ['tabular-nums'],
  },
  pomodoroPhaseText: {
    fontSize: 18, color: stensylColors.textMuted,
    marginBottom: 8, fontWeight: '600',
  },
  playPauseButton: { marginBottom: 40 },
  endSessionButtonContainer: {
    paddingHorizontal: pageHorizontalPadding,
    paddingTop: 10,
    backgroundColor: stensylColors.background,
  },
  actionButton: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  endButton: { backgroundColor: stensylColors.primaryAccent },
  disabledButtonState: {
    backgroundColor: stensylColors.disabledButton,
  },
  actionButtonText: { color: stensylColors.textWhite, fontSize: 18, fontWeight: '600' },

  modalOuterKAV: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '90%',
    maxHeight: Platform.OS === 'ios' ? '85%' : '90%',
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: stensylColors.textWhite, marginBottom: 10, marginTop: 20, textAlign: 'center' },
  modalDurationText: { fontSize: 16, color: stensylColors.textMuted, marginBottom: 15, textAlign: 'center' },
  modalInputsScrollView: {
    width: '100%',
    maxHeight: Platform.OS === 'ios' ? 250 : 200, // Adjusted for typical screen sizes
  },
  modalInputsScrollContent: {
    paddingHorizontal: 20,
  },
  modalInput: {
    width: '100%', backgroundColor: stensylColors.inputBackground,
    borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12,
    fontSize: 16, color: stensylColors.textWhite, marginBottom: 12,
    borderWidth: 1, borderColor: stensylColors.background, // Use a subtle border or theme border color
  },
  modalDescriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtonRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    width: '100%', marginTop: 15, paddingHorizontal: 20, paddingBottom: 20,
  },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  saveButton: { backgroundColor: stensylColors.successGreen },
  shareButton: { backgroundColor: stensylColors.primaryAccent },
  cancelButton: { backgroundColor: stensylColors.disabledButton }, // This was stensylColors.disabledButton in example for consistency
  modalButtonText: { color: stensylColors.textWhite, fontSize: 16, fontWeight: '600' },

  modalPickerOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  durationPickerModalContent: {
    width: '80%', maxHeight: '70%',
    backgroundColor: stensylColors.cardBackground,
    borderRadius: 15, padding: 20, alignItems: 'stretch',
  },
  durationOptionButton: {
    paddingVertical: 15, borderBottomWidth: 1,
    borderBottomColor: stensylColors.inputBackground,
    alignItems: 'center',
  },
  durationOptionSelected: {
    backgroundColor: stensylColors.modalOptionSelected,
  },
  durationOptionText: {
    color: stensylColors.textWhite,
    fontSize: 18,
  },

  // Social features styles
  socialToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: stensylColors.inputBackground,
    borderRadius: 8,
  },
  socialToggleText: {
    color: stensylColors.primaryAccent,
    fontSize: 14,
    fontWeight: '500',
  },
  socialOptionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: stensylColors.inputBackground,
  },
  motivationSection: {
    marginTop: 12,
  },
  motivationLabel: {
    color: stensylColors.textWhite,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  motivationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  motivationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: stensylColors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  motivationButtonActive: {
    borderColor: stensylColors.primaryAccent,
    backgroundColor: stensylColors.primaryAccent + '20',
  },
  motivationEmoji: {
    fontSize: 20,
  },
});

export default StudyTrackerScreen; 