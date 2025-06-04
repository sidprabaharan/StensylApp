import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Removed unused imports like useRouter, Href, SafeAreaView, StatusBar, TouchableOpacity

const screenWidth = Dimensions.get('window').width;
const numColumns = 3;
const postGap = 4; 

// Define your theme colors for consistency
const stensylColors = {
  background: '#101a23',
  cardBackground: '#1a2633',
  textWhite: '#ffffff',
  textMuted: '#90aecb',
  primaryBlue: '#0b80ee',
  avatarPlaceholderIcon: '#6b7280',
  divider: '#374151',
  postPlaceholder: '#ffffff', 
};

const showDebugStyles = false; 

const StensylHomePage = () => {
  const postsData = Array.from({ length: 9 }).map((_, i) => ({ id: `post-${i}` }));

  const renderPostItem = ({ item, index }: { item: { id: string }, index: number }) => {
    const isLastInRow = (index + 1) % numColumns === 0;
    return (
      <View
        style={[
          styles.postGridItemWrapper,
          isLastInRow && { marginRight: 0 } 
        ]}
      >
        <View style={styles.postGridItemSquare}>
          {showDebugStyles && <Text style={{ fontSize: 8, color: 'black', textAlign:'center' }}>Post {index + 1}</Text>}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      ListHeaderComponent={
        <>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={60} color={stensylColors.avatarPlaceholderIcon} />
            </View>
            <View>
              <Text style={styles.profileName}>Ben Little</Text>
              <Text style={styles.profileLocation}>Toronto, ON</Text>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>1.2K</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>850</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {/* Bio Section */}
          <Text style={styles.bioText}>
            App developer and designer. Sharing my health and fitness journey.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />
        </>
      }
      data={postsData}
      renderItem={renderPostItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      style={styles.gridListStyle} 
      contentContainerStyle={styles.gridListContentContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const pageHorizontalPadding = 16;
const availableWidthForGrid = screenWidth - (pageHorizontalPadding * 2);
const postItemCalculatedWidth = (availableWidthForGrid - (postGap * (numColumns - 1))) / numColumns;

const styles = StyleSheet.create({
  profileSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    marginBottom: 24, 
    paddingHorizontal: pageHorizontalPadding, 
    marginTop: 16 
  },
  avatarContainer: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: '#d1d5db', 
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: stensylColors.primaryBlue,
  },
  profileName: { color: stensylColors.textWhite, fontSize: 20, fontWeight: 'bold' },
  profileLocation: { color: stensylColors.textMuted, fontSize: 14 },
  statsSection: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: stensylColors.cardBackground, padding: 12, borderRadius: 12, 
    marginBottom: 24, marginHorizontal: pageHorizontalPadding,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, 
    shadowRadius: 4.65, elevation: 8,
  },
  statItem: { alignItems: 'center' },
  statNumber: { color: stensylColors.textWhite, fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: stensylColors.textMuted, fontSize: 12 },
  bioText: { 
    color: stensylColors.textWhite, fontSize: 14, lineHeight: 14 * 1.625, 
    marginBottom: 24, 
    paddingHorizontal: pageHorizontalPadding, // MODIFIED: Was pageHorizontalPadding + 4
  },
  divider: {
    borderTopWidth: 1,
    borderColor: stensylColors.divider,
    marginBottom: 16, 
    marginHorizontal: pageHorizontalPadding
  },
  gridListStyle: {},
  gridListContentContainer: {
    paddingHorizontal: pageHorizontalPadding,
    paddingTop: 0, 
    paddingBottom: 10, 
    ...(showDebugStyles ? { backgroundColor: 'rgba(255,0,0,0.2)'} : {}),
  },
  postGridItemWrapper: {
    width: postItemCalculatedWidth,
    marginRight: postGap,
    marginBottom: postGap,
  },
  postGridItemSquare: {
    aspectRatio: 1,
    backgroundColor: stensylColors.postPlaceholder,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    ...(showDebugStyles ? { borderWidth: 1, borderColor: 'blue' } : {}),
  },
});

export default StensylHomePage;