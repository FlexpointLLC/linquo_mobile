import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { ChevronDown, Monitor, Smartphone, Tablet, X, ArrowRight } from 'lucide-react-native';

interface AnalyticsData {
  metrics: {
    activeUsers: number;
    totalVisitors: number;
    engagement: number;
    resolved: number;
    agents: string;
  };
  chartData: Array<{
    date: string;
    conversations: number;
    messages: number;
    resolved: number;
  }>;
  summary: {
    totalConversations: number;
    totalMessages: number;
    resolvedConversations: number;
    activeAgents: number;
    totalAgents: number;
    totalVisitors: number;
  };
}

interface ActiveUserDetail {
  sessionId: string;
  pageUrl: string;
  city: string;
  country: string;
  countryCode: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  lastSeen: string;
}

interface VisitorByCountry {
  country: string;
  countryCode: string | null;
  count: number;
  visitors: Array<{
    sessionId: string;
    city: string;
    pageUrl: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    lastSeen: string;
  }>;
}

// Helper function to format time ago with proper timezone handling
const formatTimeAgo = (date: string): string => {
  try {
    // Ensure the timestamp is parsed as UTC by adding 'Z' if not present (same as web app)
    const utcDate = date.endsWith('Z') ? date : date + 'Z';
    const lastSeenTime = new Date(utcDate).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - lastSeenTime) / 1000);
    
    // Handle edge cases
    if (seconds < 0) return 'Just now';
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown';
  }
};

export default function AnalyticsScreen() {
  const { isDarkMode } = useTheme();
  const [timeRange, setTimeRange] = useState('7');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);
  const [activeUsersDetails, setActiveUsersDetails] = useState<ActiveUserDetail[]>([]);
  const [showActiveUsersDrawer, setShowActiveUsersDrawer] = useState(false);
  const [visitorsByCountry, setVisitorsByCountry] = useState<VisitorByCountry[]>([]);
  const [showVisitorsDrawer, setShowVisitorsDrawer] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';

  const timeRangeOptions = [
    { label: 'Today', value: '0' },
    { label: 'Last 7 Days', value: '7' },
    { label: 'Last 14 Days', value: '14' },
    { label: 'Last 30 Days', value: '30' },
    { label: 'Last 90 Days', value: '90' },
  ];

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const days = parseInt(timeRange);
      const endDate = new Date();
      const startDate = new Date();
      
      if (days === 0) {
        // For "Today", set start to beginning of today in UTC
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);
      } else {
        startDate.setDate(startDate.getDate() - days);
      }

      // Fetch conversations data for the date range
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, created_at, state')
        .eq('org_id', agentData.org_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch messages data for engagement metrics
      const { data: messages } = await supabase
        .from('messages')
        .select('id, created_at, conversation_id')
        .eq('org_id', agentData.org_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Fetch active agents
      const { data: agents } = await supabase
        .from('agents')
        .select('id, display_name, online_status')
        .eq('org_id', agentData.org_id)
        .eq('is_active', true);

      // Process data for charts
      const dailyData: { [key: string]: { conversations: number; messages: number; resolved: number } } = {};
      
      if (days === 0) {
        // For "Today", initialize hourly data from 12 AM to current hour (UTC)
        const currentHour = new Date().getUTCHours();
        for (let hour = 0; hour <= currentHour; hour++) {
          const hourKey = `${hour.toString().padStart(2, '0')}:00`;
          dailyData[hourKey] = { conversations: 0, messages: 0, resolved: 0 };
        }
      } else {
        // Initialize all days in range
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateKey = date.toISOString().split('T')[0];
          dailyData[dateKey] = { conversations: 0, messages: 0, resolved: 0 };
        }
      }

      // Count conversations per day/hour
      conversations?.forEach((conv) => {
        let key: string;
        if (days === 0) {
          // For "Today", group by hour (UTC)
          const convDate = new Date(conv.created_at);
          const hour = convDate.getUTCHours();
          key = `${hour.toString().padStart(2, '0')}:00`;
        } else {
          // For other ranges, group by date (UTC date)
          key = conv.created_at.split('T')[0];
        }
        
        if (dailyData[key]) {
          dailyData[key].conversations += 1;
          if (conv.state === 'CLOSED') {
            dailyData[key].resolved += 1;
          }
        }
      });

      // Count messages per day/hour
      messages?.forEach((msg) => {
        let key: string;
        if (days === 0) {
          // For "Today", group by hour (UTC)
          const msgDate = new Date(msg.created_at);
          const hour = msgDate.getUTCHours();
          key = `${hour.toString().padStart(2, '0')}:00`;
        } else {
          // For other ranges, group by date (UTC date)
          key = msg.created_at.split('T')[0];
        }
        
        if (dailyData[key]) {
          dailyData[key].messages += 1;
        }
      });

      // Format chart data
      const chartData = Object.entries(dailyData).map(([key, data]) => {
        let formattedDate: string;
        
        if (days === 0) {
          // For "Today", use time format (already in HH:00 format)
          formattedDate = key;
        } else {
          // For other ranges, format as date
          // Parse the date string manually to avoid timezone issues
          const parts = key.split('-');
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // 0-indexed
          const day = parseInt(parts[2]);
          const dateObj = new Date(year, month, day);
          
          // Format the date
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          formattedDate = `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`;
        }
        
        return {
          date: formattedDate,
          conversations: data.conversations,
          messages: data.messages,
          resolved: data.resolved,
        };
      });

      // Calculate metrics
      const totalConversations = conversations?.length || 0;
      const resolvedConversations = conversations?.filter(c => c.state === 'CLOSED').length || 0;
      const totalMessages = messages?.length || 0;
      const activeAgents = agents?.filter(a => a.online_status === 'ONLINE').length || 0;
      const totalAgents = agents?.length || 0;

      // Get real-time active users (sessions active in last 90 seconds)
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
      const { data: activeSessions } = await supabase
        .from('active_sessions')
        .select('session_id, page_url')
        .eq('org_id', agentData.org_id)
        .gte('last_seen', ninetySecondsAgo);

      // Get total visitors (all unique sessions in the selected time range)
      const { data: allSessions } = await supabase
        .from('active_sessions')
        .select('session_id, page_url')
        .eq('org_id', agentData.org_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Filter out admin/dashboard pages
      const filterAdminPages = (sessions: Array<{ page_url?: string }>) => {
        return sessions?.filter(session => {
          const url = session.page_url || '';
          return !url.includes('localhost:3000') && 
                 !url.includes('localhost:3001') && 
                 !url.includes('admin.linquo.app');
        }) || [];
      };

      const filteredActiveSessions = filterAdminPages(activeSessions || []);
      const filteredAllSessions = filterAdminPages(allSessions || []);

      const activeUsers = filteredActiveSessions.length;
      const totalVisitors = filteredAllSessions.length;

      setAnalyticsData({
        metrics: {
          activeUsers: activeUsers,
          totalVisitors: totalVisitors,
          engagement: totalMessages,
          resolved: resolvedConversations,
          agents: `${activeAgents}/${totalAgents}`,
        },
        chartData,
        summary: {
          totalConversations,
          totalMessages,
          resolvedConversations,
          activeAgents,
          totalAgents,
          totalVisitors,
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [timeRange]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      await fetchAnalytics();
      setLoading(false);
    };
    loadAnalytics();
  }, [fetchAnalytics]);

  // Fetch only active users and total visitors every 30 seconds
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: agentData } = await supabase
          .from('agents')
          .select('org_id')
          .eq('user_id', user.id)
          .single();

        if (!agentData) return;

        const days = parseInt(timeRange);
        const endDate = new Date();
        const startDate = new Date();
        
        if (days === 0) {
          startDate.setUTCHours(0, 0, 0, 0);
          endDate.setUTCHours(23, 59, 59, 999);
        } else {
          startDate.setDate(startDate.getDate() - days);
        }

        // Get real-time active users (sessions active in last 90 seconds)
        const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
        const { data: activeSessions } = await supabase
          .from('active_sessions')
          .select('session_id, page_url')
          .eq('org_id', agentData.org_id)
          .gte('last_seen', ninetySecondsAgo);

        // Get total visitors
        const { data: allSessions } = await supabase
          .from('active_sessions')
          .select('session_id, page_url')
          .eq('org_id', agentData.org_id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Filter out admin pages
        const filterAdminPages = (sessions: Array<{ page_url?: string }>) => {
          return sessions?.filter(session => {
            const url = session.page_url || '';
            return !url.includes('localhost:3000') && 
                   !url.includes('localhost:3001') && 
                   !url.includes('admin.linquo.app');
          }) || [];
        };

        const filteredActiveSessions = filterAdminPages(activeSessions || []);
        const filteredAllSessions = filterAdminPages(allSessions || []);

        setActiveUsers(filteredActiveSessions.length);
        setTotalVisitors(filteredAllSessions.length);
      } catch (error) {
        console.error('Error fetching live metrics:', error);
      }
    };

    // Initial fetch
    fetchLiveMetrics();

    // Fetch every 30 seconds
    const intervalId = setInterval(fetchLiveMetrics, 30000);
    
    return () => clearInterval(intervalId);
  }, [timeRange]);

  // Fetch active users details when drawer opens
  useEffect(() => {
    if (showActiveUsersDrawer) {
      fetchActiveUsersDetails();
    }
  }, [showActiveUsersDrawer]);

  // Fetch visitors by country when drawer opens
  useEffect(() => {
    if (showVisitorsDrawer) {
      fetchVisitorsByCountry();
    }
  }, [showVisitorsDrawer]);

  // Animate drawer
  useEffect(() => {
    if (showActiveUsersDrawer || showVisitorsDrawer) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 90,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showActiveUsersDrawer, showVisitorsDrawer]);

  const fetchActiveUsersDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
      const { data: activeSessions } = await supabase
        .from('active_sessions')
        .select('session_id, page_url, city, country, country_code, device_type, last_seen')
        .eq('org_id', agentData.org_id)
        .gte('last_seen', ninetySecondsAgo)
        .order('last_seen', { ascending: false });

      const filteredSessions = (activeSessions || []).filter(session => {
        const url = session.page_url || '';
        return !url.includes('localhost:3000') && 
               !url.includes('localhost:3001') && 
               !url.includes('admin.linquo.app');
      });

      const activeUsersData = filteredSessions.map(session => ({
        sessionId: session.session_id,
        pageUrl: session.page_url,
        city: session.city || 'Unknown',
        country: session.country || 'Unknown',
        countryCode: session.country_code || null,
        deviceType: (session.device_type || 'desktop') as 'mobile' | 'tablet' | 'desktop',
        lastSeen: session.last_seen,
      }));

      setActiveUsersDetails(activeUsersData);
    } catch (error) {
      console.error('Error fetching active users details:', error);
    }
  };

  const fetchVisitorsByCountry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agentData } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const days = parseInt(timeRange);
      const endDate = new Date();
      const startDate = new Date();
      
      if (days === 0) {
        startDate.setUTCHours(0, 0, 0, 0);
        endDate.setUTCHours(23, 59, 59, 999);
      } else {
        startDate.setDate(startDate.getDate() - days);
      }

      const { data: allSessions } = await supabase
        .from('active_sessions')
        .select('session_id, page_url, city, country, country_code, device_type, last_seen')
        .eq('org_id', agentData.org_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('last_seen', { ascending: false });

      const filteredSessions = (allSessions || []).filter(session => {
        const url = session.page_url || '';
        return !url.includes('localhost:3000') && 
               !url.includes('localhost:3001') && 
               !url.includes('admin.linquo.app');
      });

      // Group by country
      const countryMap = new Map<string, VisitorByCountry>();
      filteredSessions.forEach(session => {
        const country = session.country || 'Unknown';
        if (!countryMap.has(country)) {
          countryMap.set(country, {
            country,
            countryCode: session.country_code || null,
            count: 0,
            visitors: [],
          });
        }
        const countryData = countryMap.get(country)!;
        countryData.count++;
        countryData.visitors.push({
          sessionId: session.session_id,
          city: session.city || 'Unknown',
          pageUrl: session.page_url,
          deviceType: (session.device_type || 'desktop') as 'mobile' | 'tablet' | 'desktop',
          lastSeen: session.last_seen,
        });
      });

      const visitorsByCountryData = Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
      setVisitorsByCountry(visitorsByCountryData);
    } catch (error) {
      console.error('Error fetching visitors by country:', error);
    }
  };

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(country)) {
        newSet.delete(country);
      } else {
        newSet.add(country);
      }
      return newSet;
    });
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  const MetricCard = ({ title, value, description }: { title: string; value: string | number; description: string }) => (
    <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
      <Text style={[styles.metricTitle, { color: mutedColor }]}>{title}</Text>
      <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.metricDescription, { color: mutedColor }]}>{description}</Text>
    </View>
  );

  const selectedLabel = timeRangeOptions.find(opt => opt.value === timeRange)?.label || 'Last 7 Days';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: mutedColor }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Analytics</Text>
          <Text style={[styles.headerSubtitle, { color: mutedColor }]}>Track your performance</Text>
        </View>
        <TouchableOpacity
          style={[styles.timeRangeButton, { borderColor }]}
          onPress={() => setShowTimeRangePicker(true)}
        >
          <Text style={[styles.timeRangeButtonText, { color: textColor }]}>{selectedLabel}</Text>
          <ChevronDown size={16} color={textColor} />
        </TouchableOpacity>
      </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
                colors={['#3b82f6']}
              />
            }
          >
            {/* Top Metric Cards */}
            <View style={styles.metricsGrid}>
              {/* Active Now - Clickable */}
              <TouchableOpacity
                style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => setShowActiveUsersDrawer(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricTitle, { color: mutedColor }]}>Active Now</Text>
                <Text style={[styles.metricValue, { color: textColor }]}>{activeUsers}</Text>
                <View style={styles.metricFooter}>
                  <Text style={[styles.metricDescription, { color: mutedColor }]}>On your website</Text>
                  <ArrowRight size={12} color={mutedColor} />
                </View>
              </TouchableOpacity>

              {/* Total Visitors - Clickable */}
              <TouchableOpacity
                style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}
                onPress={() => setShowVisitorsDrawer(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.metricTitle, { color: mutedColor }]}>Total Visitors</Text>
                <Text style={[styles.metricValue, { color: textColor }]}>{totalVisitors}</Text>
                <View style={styles.metricFooter}>
                  <Text style={[styles.metricDescription, { color: mutedColor }]}>In selected time range</Text>
                  <ArrowRight size={12} color={mutedColor} />
                </View>
              </TouchableOpacity>

              <MetricCard
                title="Agents"
                value={analyticsData?.metrics.agents || '0/0'}
                description="Online / Total"
              />
              <MetricCard
                title="Engagement"
                value={analyticsData?.metrics.engagement || 0}
                description="Total messages"
              />
            </View>

        {/* Chart */}
        {analyticsData?.chartData && analyticsData.chartData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: cardBg, borderColor }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
            >
              <BarChart
                data={{
                  labels: analyticsData.chartData.map(d => d.date),
                  datasets: [
                    {
                      data: analyticsData.chartData.map(d => d.conversations),
                    },
                  ],
                }}
                width={Math.max(Dimensions.get('window').width - 32, analyticsData.chartData.length * 50)}
                height={300}
                chartConfig={{
                  backgroundColor: cardBg,
                  backgroundGradientFrom: cardBg,
                  backgroundGradientTo: cardBg,
                  decimalPlaces: 0,
                  color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                  labelColor: () => mutedColor,
                  barPercentage: 0.7,
                  style: {
                    borderRadius: 0,
                    paddingRight: 0,
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: borderColor,
                    strokeOpacity: 0.3,
                  },
                }}
                style={{
                  paddingRight: 16,
                  marginBottom: -12,
                }}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={false}
                withInnerLines={true}
                showBarTops={false}
                fromZero={true}
              />
            </ScrollView>
          </View>
        )}

            {/* Bottom Metric Cards */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Conversations"
                value={analyticsData?.summary.totalConversations || 0}
                description="In the selected period"
              />
              <MetricCard
                title="Resolved"
                value={analyticsData?.metrics.resolved || 0}
                description="Closed conversations"
              />
              <MetricCard
                title="Resolution Rate"
                value={
                  analyticsData?.summary.totalConversations
                    ? `${Math.round(
                        (analyticsData.summary.resolvedConversations / analyticsData.summary.totalConversations) * 100
                      )}%`
                    : '0%'
                }
                description={`${analyticsData?.summary.resolvedConversations || 0} of ${
                  analyticsData?.summary.totalConversations || 0
                } resolved`}
              />
              <MetricCard
                title="Avg. Messages per Conversation"
                value={
                  analyticsData?.summary.totalConversations
                    ? Math.round(analyticsData.summary.totalMessages / analyticsData.summary.totalConversations)
                    : 0
                }
                description="Messages per conversation"
              />
            </View>
          </ScrollView>

      {/* Time Range Picker Modal */}
      <Modal visible={showTimeRangePicker} transparent animationType="fade" onRequestClose={() => setShowTimeRangePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTimeRangePicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor }]}>
            {timeRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  { borderBottomColor: borderColor },
                  timeRange === option.value && { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
                ]}
                onPress={() => {
                  setTimeRange(option.value);
                  setShowTimeRangePicker(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: textColor }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Active Users Drawer */}
      <Modal
        visible={showActiveUsersDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowActiveUsersDrawer(false)}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => setShowActiveUsersDrawer(false)} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.drawerTitle, { color: textColor }]}>Active Users ({activeUsers})</Text>
              <TouchableOpacity onPress={() => setShowActiveUsersDrawer(false)} style={styles.closeButton}>
                <X size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.drawerScrollView} contentContainerStyle={styles.drawerScrollContent}>
              {activeUsersDetails.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: mutedColor }]}>No active users right now</Text>
                </View>
              ) : (
                activeUsersDetails.map((user) => (
                  <View key={user.sessionId} style={[styles.userCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.userCardContent}>
                      <View style={styles.userIcon}>
                        {user.deviceType === 'mobile' && <Smartphone size={24} color="#3b82f6" />}
                        {user.deviceType === 'tablet' && <Tablet size={24} color="#3b82f6" />}
                        {user.deviceType === 'desktop' && <Monitor size={24} color="#3b82f6" />}
                      </View>
                      <View style={styles.userInfo}>
                        <View style={styles.userLocation}>
                          {user.countryCode && (
                            <Text style={styles.countryFlag}>
                              {String.fromCodePoint(...user.countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))}
                            </Text>
                          )}
                          <Text style={[styles.userLocationText, { color: textColor }]}>
                            {user.city}, {user.country}
                          </Text>
                        </View>
                        <Text style={[styles.userPageUrl, { color: mutedColor }]} numberOfLines={1}>
                          {user.pageUrl}
                        </Text>
                        <View style={styles.userMeta}>
                          <Text style={[styles.userMetaText, { color: mutedColor }]}>{user.deviceType}</Text>
                          <Text style={[styles.userMetaText, { color: mutedColor }]}>•</Text>
                          <Text style={[styles.userMetaText, { color: mutedColor }]}>Active {formatTimeAgo(user.lastSeen)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Visitors Drawer */}
      <Modal
        visible={showVisitorsDrawer}
        transparent
        animationType="none"
        onRequestClose={() => setShowVisitorsDrawer(false)}
      >
        <Animated.View style={[styles.drawerOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => setShowVisitorsDrawer(false)} />
          <Animated.View
            style={[
              styles.drawerContainer,
              { backgroundColor, borderTopColor: borderColor, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.drawerTitle, { color: textColor }]}>Total Visitors ({totalVisitors})</Text>
              <TouchableOpacity onPress={() => setShowVisitorsDrawer(false)} style={styles.closeButton}>
                <X size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.drawerScrollView} contentContainerStyle={styles.drawerScrollContent}>
              {visitorsByCountry.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: mutedColor }]}>No visitors in this time range</Text>
                </View>
              ) : (
                visitorsByCountry.map((visitor, index) => {
                  const isExpanded = expandedCountries.has(visitor.country);
                  return (
                    <View key={index} style={[styles.countryCard, { borderColor }]}>
                      <TouchableOpacity
                        style={[styles.countryHeader, { backgroundColor: cardBg }]}
                        onPress={() => toggleCountry(visitor.country)}
                      >
                        <View style={styles.countryHeaderLeft}>
                          {visitor.countryCode && (
                            <Text style={styles.countryFlagLarge}>
                              {String.fromCodePoint(...visitor.countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))}
                            </Text>
                          )}
                          <Text style={[styles.countryName, { color: textColor }]}>{visitor.country}</Text>
                        </View>
                        <View style={styles.countryHeaderRight}>
                          <Text style={[styles.countryCount, { color: mutedColor }]}>
                            {visitor.count} {visitor.count === 1 ? 'User' : 'Users'}
                          </Text>
                          <Animated.View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
                            <ChevronDown size={20} color={mutedColor} />
                          </Animated.View>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={[styles.countryVisitors, { borderTopColor: borderColor }]}>
                          {visitor.visitors
                            .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
                            .map((v, vIndex) => (
                              <View key={vIndex} style={styles.visitorItem}>
                                <View style={styles.visitorIcon}>
                                  {v.deviceType === 'mobile' && <Smartphone size={16} color={mutedColor} />}
                                  {v.deviceType === 'tablet' && <Tablet size={16} color={mutedColor} />}
                                  {v.deviceType === 'desktop' && <Monitor size={16} color={mutedColor} />}
                                </View>
                                <View style={styles.visitorInfo}>
                                  <Text style={[styles.visitorCity, { color: textColor }]}>
                                    {v.city}, {visitor.country}
                                  </Text>
                                  <Text style={[styles.visitorPageUrl, { color: mutedColor }]} numberOfLines={1}>
                                    {v.pageUrl}
                                  </Text>
                                  <View style={styles.visitorMeta}>
                                    <Text style={[styles.visitorMetaText, { color: mutedColor }]}>{v.deviceType}</Text>
                                    <Text style={[styles.visitorMetaText, { color: mutedColor }]}>•</Text>
                                    <Text style={[styles.visitorMetaText, { color: mutedColor }]}>
                                      Visited {formatTimeAgo(v.lastSeen)}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  timeRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  timeRangeButtonText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32 + 80, // 32px extra margin + approximate height of bottom nav (64px) + some buffer
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 11,
  },
  metricFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  chartCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartScrollContent: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  chartPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayPressable: {
    flex: 1,
  },
  drawerContainer: {
    height: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  userCardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  userIcon: {
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  countryFlag: {
    fontSize: 18,
  },
  userLocationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userPageUrl: {
    fontSize: 12,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userMetaText: {
    fontSize: 11,
  },
  countryCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  countryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryFlagLarge: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  countryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCount: {
    fontSize: 14,
  },
  countryVisitors: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
  },
  visitorItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  visitorIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  visitorInfo: {
    flex: 1,
    minWidth: 0,
  },
  visitorCity: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  visitorPageUrl: {
    fontSize: 12,
    marginBottom: 4,
  },
  visitorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitorMetaText: {
    fontSize: 11,
  },
});

