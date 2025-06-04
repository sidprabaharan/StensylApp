import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ContributionGraph, LineChart } from 'react-native-chart-kit';
// Removed unused imports like Href, useRouter as header navigation is handled by layout

// Define your theme colors
const stensylColors = {
  background: '#101a23',
  textWhite: '#ffffff',
  cardBackground: '#1a2633',
  textMuted: '#90aecb',
  primaryAccent: '#0b80ee',
  chartBoxBackground: '#1a2633', 
  chartLabelColor: 'rgba(255, 255, 255, 0.7)',
  chartGridColor: 'rgba(255, 255, 255, 0.2)',
  dotFillColor: '#FFFFFF',
  chartAreaFillColor: '#CCCCCC',
  buttonBackground: '#0b80ee', 
  buttonText: '#FFFFFF',
  contributionGraphTodayHighlight: '#FFA500',
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void; // MODIFIED: Added onPress prop to make it touchable
}
const StatCard: React.FC<StatCardProps> = ({ label, value, iconName, onPress }) => {
  const cardContent = (
    <View style={styles.statCardInnerContent}>
      {iconName && (
        <MaterialIcons name={iconName} size={24} color={stensylColors.primaryAccent} style={styles.statCardIcon} />
      )}
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }
  return <View style={styles.statCard}>{cardContent}</View>;
};

// Function to generate placeholder contribution data
const formatDateISO = (date: Date): string => date.toISOString().split('T')[0];
const generateContributionData = (endDate: Date, numDays: number, fillProbability: number) => {
  const data = [];
  const todayStr = formatDateISO(new Date()); 
  for (let i = 0; i < numDays; i++) {
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - i);
    const dateString = formatDateISO(date);
    let count = 0;
    if (Math.random() < fillProbability) count = 1;
    if (dateString === todayStr && count > 0) count = 2; 
    if (count > 0) data.push({ date: dateString, count: count }); 
  }
  return data; 
};


const StudyStatisticsScreen = () => {
  const [studyStreak, setStudyStreak] = useState(12);
  const [hoursThisWeek, setHoursThisWeek] = useState(8.5); 
  // MODIFIED: State for toggling the second stat card
  const [showHoursStat, setShowHoursStat] = useState(true);
  const [averageWeeklyEfficiency, setAverageWeeklyEfficiency] = useState(7.8); // Placeholder

  const dailyHoursData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 
    datasets: [
      {
        data: [0, Math.random()*12, Math.random()*12, Math.random()*12, Math.random()*12, Math.random()*12, 12].map(v=>parseFloat(v.toFixed(1))),
        color: (opacity = 1) => stensylColors.primaryAccent, 
        strokeWidth: 3,
        fillShadowGradient: stensylColors.chartAreaFillColor,
        fillShadowGradientOpacity: 0.2,
      },
    ],
  };

  const screenWidth = Dimensions.get("window").width;
  const lineChartDrawableWidth = screenWidth - (pageHorizontalPadding + graphBoxInset) * 2 - (graphBoxInternalPadding * 2);

  const contributionGraphScrollViewRef = useRef<ScrollView>(null);
  const currentYear = new Date().getFullYear();
  const yearEndDate = new Date(currentYear, 11, 31); 
  const daysInYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0 ? 366 : 365;
  
  const contributionData = useMemo(() => {
    return generateContributionData(yearEndDate, daysInYear, 0.65); 
  }, [currentYear]); 

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (1000 * 3600 * 24));
    const currentWeekOfYear = Math.ceil(dayOfYear / 7);
    const squareSize = 16; const gutterSize = 2; const weekColumnWidth = squareSize + gutterSize;
    const targetScrollX = (currentWeekOfYear * weekColumnWidth) - ( (screenWidth - (pageHorizontalPadding + graphBoxInset)*2 - graphBoxInternalPadding*2) / 2) + (weekColumnWidth / 2); 
    const timeoutId = setTimeout(() => {
      if (contributionGraphScrollViewRef.current) {
        contributionGraphScrollViewRef.current.scrollTo({ x: Math.max(0, targetScrollX), animated: false });
      }
    }, 100); 
    return () => clearTimeout(timeoutId);
  }, []); 

  const lineChartSpecificConfig = { 
    backgroundColor: stensylColors.chartBoxBackground, 
    backgroundGradientFrom: stensylColors.chartBoxBackground,
    backgroundGradientTo: stensylColors.chartBoxBackground,
    decimalPlaces: 1, 
    color: (opacity = 1) => stensylColors.chartLabelColor,
    labelColor: (opacity = 1) => stensylColors.chartLabelColor,
    style: { borderRadius: 12, paddingLeft: 0, paddingRight: 16 }, 
    propsForDots: { r: "6", strokeWidth: "2", stroke: stensylColors.primaryAccent, fill: stensylColors.dotFillColor },
    propsForBackgroundLines: { stroke: stensylColors.chartGridColor, strokeDasharray: "" },
    segments: 4, 
  };

  const contributionGraphChartConfig = { 
    backgroundGradientFrom: stensylColors.chartBoxBackground, 
    backgroundGradientTo: stensylColors.chartBoxBackground,
    color: (opacity = 1, count?: number) => { 
      if (count === 2) return stensylColors.contributionGraphTodayHighlight; 
      if (count && count > 0) return `rgba(11, 128, 238, ${opacity})`; 
      return `rgba(255, 255, 255, ${opacity * 0.08})`; 
    },
    labelColor: (opacity = 1) => stensylColors.chartLabelColor, 
  };

  const handleAdvancedStatsPress = () => {
    console.log("Advanced Statistics button pressed!");
    // router.push('/advancedstats' as Href);
  };

  // MODIFIED: Function to toggle the second stat card's display
  const toggleSecondStatCard = () => {
    setShowHoursStat(prev => !prev);
  };

  return (
    <ScrollView style={styles.contentScrollView}>
      <View style={styles.contentContainer}>
        <Text style={styles.pageTitle}>Study Statistics</Text>

        <View style={styles.statsRowContainer}>
          <StatCard label="Study Streak" value={`${studyStreak} days`} iconName="local-fire-department" />
          {/* MODIFIED: Second StatCard is now interactive */}
          <StatCard 
            label={showHoursStat ? "Hours This Week" : "Avg. Efficiency"}
            value={showHoursStat ? `${hoursThisWeek} h` : `${averageWeeklyEfficiency.toFixed(1)}/10`}
            iconName={showHoursStat ? "timer" : "star-rate"}
            onPress={toggleSecondStatCard}
          />
        </View>

        {/* Line Chart Section */}
        <View style={styles.graphSectionContainer}> 
          <Text style={styles.chartTitle}>Daily Study Progress (This Week)</Text>
          <View style={styles.chartBox}> 
            <LineChart
              data={dailyHoursData} 
              width={lineChartDrawableWidth} 
              height={240} 
              yAxisLabel="" yAxisSuffix=" h" 
              chartConfig={lineChartSpecificConfig} 
              bezier style={styles.chartStyle} fromZero={true} 
            />
          </View>
        </View>

        {/* Monthly Study Activity Section */}
        <View style={styles.graphSectionContainer}> 
          <Text style={styles.chartTitle}>Study Activity ({currentYear})</Text> 
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.chartBox} 
            ref={contributionGraphScrollViewRef} 
          >
            <ContributionGraph
              values={contributionData}
              endDate={yearEndDate} 
              numDays={daysInYear} 
              width={53 * (16 + 2) + pageHorizontalPadding} 
              height={220}
              chartConfig={contributionGraphChartConfig} 
              squareSize={16} 
              gutterSize={2} 
              tooltipDataAttrs={() => ({})}
            />
          </ScrollView>
        </View>

        {/* Advanced Statistics Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.advancedStatsButton} onPress={handleAdvancedStatsPress}>
            <Text style={styles.advancedStatsButtonText}>Advanced Statistics</Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color={stensylColors.buttonText} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const pageHorizontalPadding = 16; 
const graphBoxInset = 10; 
const graphBoxInternalPadding = 8; 

const styles = StyleSheet.create({
  contentScrollView: { 
    flex: 1, 
    backgroundColor: stensylColors.background, 
  },
  contentContainer: {
    paddingVertical: 20, 
    paddingBottom: 80, 
  },
  pageTitle: {
    fontSize: 22, fontWeight: 'bold', color: stensylColors.textWhite,
    marginBottom: 20, paddingHorizontal: pageHorizontalPadding, 
    marginTop: 16, 
  },
  statsRowContainer: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    marginBottom: 24, paddingHorizontal: pageHorizontalPadding, 
  },
  statCard: { // Style for the TouchableOpacity if onPress is provided, or View otherwise
    flex: 1, backgroundColor: stensylColors.cardBackground, borderRadius: 12,
    alignItems: 'center', marginHorizontal: 4,
    // Padding is now on statCardInnerContent to ensure touchable area is full card
  },
  statCardInnerContent: { // New style for the content inside the card
    padding: 16, 
    alignItems: 'center',
    width: '100%', // Ensure content takes full width of card
  },
  statCardIcon: { marginBottom: 8 },
  statCardValue: { fontSize: 24, fontWeight: 'bold', color: stensylColors.textWhite, marginBottom: 4 },
  statCardLabel: { fontSize: 13, color: stensylColors.textMuted, textAlign: 'center' },
  
  graphSectionContainer: { 
    width: '100%',
    paddingHorizontal: pageHorizontalPadding + graphBoxInset, 
    marginBottom: 24,
  },
  chartTitle: { 
    fontSize: 16, fontWeight: '600', color: stensylColors.textWhite,
    marginBottom: 12, alignSelf: 'flex-start', 
  },
  chartBox: { 
    backgroundColor: stensylColors.chartBoxBackground, 
    borderRadius: 12, 
    padding: graphBoxInternalPadding, 
    overflow: 'hidden', 
  },
  chartStyle: { }, 
  buttonContainer: { 
    width: '100%',
    paddingHorizontal: pageHorizontalPadding, 
  },
  advancedStatsButton: {
    backgroundColor: stensylColors.buttonBackground,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 24, 
  },
  advancedStatsButtonText: {
    color: stensylColors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {},
});

export default StudyStatisticsScreen;