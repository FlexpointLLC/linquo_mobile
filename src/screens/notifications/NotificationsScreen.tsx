import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { ArrowLeft, Megaphone, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  created_by: string;
  is_read: boolean;
}

interface NotificationsScreenProps {
  onBack: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        // Get agent ID first
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (agentError) {
          console.error('Error fetching agent:', agentError);
          return;
        }

        setAgentId(agentData.id);

        // Fetch all global notifications (org_id is NULL) and org-specific ones
        // The RLS policy handles filtering, so we just fetch all notifications
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (notificationsError) {
          console.error('Error fetching notifications:', notificationsError);
          return;
        }

        // Fetch read status for current agent
        const { data: readsData, error: readsError } = await supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('agent_id', agentData.id);

        if (readsError) {
          console.error('Error fetching read status:', readsError);
          return;
        }

        const readNotificationIds = new Set(readsData?.map(r => r.notification_id) || []);

        // Combine data
        const combinedNotifications = (notificationsData || []).map(n => ({
          id: n.id,
          title: n.title,
          body: n.body,
          created_at: n.created_at,
          created_by: n.created_by,
          is_read: readNotificationIds.has(n.id),
        }));

        setNotifications(combinedNotifications);
      } catch (error) {
        console.error('Error in fetchNotifications:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchNotifications();

    // Subscribe to new global notifications (no filter = all notifications)
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [{
            ...newNotification,
            is_read: false,
          }, ...prev]);
          Alert.alert('New announcement received!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    if (!agentId) return;

    try {
      const { error } = await supabase
        .from('notification_reads')
        .insert({
          notification_id: notificationId,
          agent_id: agentId,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!agentId) return;

    setMarkingAllRead(true);

    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);

      // Insert read records for all unread notifications
      const { error } = await supabase
        .from('notification_reads')
        .insert(
          unreadNotifications.map(n => ({
            notification_id: n.id,
            agent_id: agentId,
          }))
        );

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error marking all as read:', error);
        Alert.alert('Error', 'Failed to mark all as read');
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );

      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Re-trigger the useEffect by updating a dummy state or just refetch
    if (user?.id) {
      // Simplified: just set refreshing and the data will be fetched
      setLoading(true);
      const fetchAgain = async () => {
        try {
          const { data: agentData } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (!agentData) return;

          const { data: notificationsData } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

          const { data: readsData } = await supabase
            .from('notification_reads')
            .select('notification_id')
            .eq('agent_id', agentData.id);

          const readNotificationIds = new Set(readsData?.map(r => r.notification_id) || []);

          const combinedNotifications = (notificationsData || []).map(n => ({
            id: n.id,
            title: n.title,
            body: n.body,
            created_at: n.created_at,
            created_by: n.created_by,
            is_read: readNotificationIds.has(n.id),
          }));

          setNotifications(combinedNotifications);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      };
      fetchAgain();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Announcements</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={[styles.markAllText, { color: '#3b82f6' }]}>Mark all read</Text>
            )}
          </TouchableOpacity>
        )}
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={48} color={mutedColor} opacity={0.5} />
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              No announcements yet
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                { borderBottomColor: borderColor },
                !notification.is_read && { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)' },
              ]}
              onPress={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
              }}
            >
              <View style={styles.notificationHeader}>
                <Text style={[styles.notificationTitle, { color: textColor }]} numberOfLines={1}>
                  {notification.title}
                </Text>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>
              <Text style={[styles.notificationBody, { color: mutedColor }]} numberOfLines={2}>
                {notification.body}
              </Text>
              <View style={styles.notificationFooter}>
                <Text style={[styles.notificationTime, { color: mutedColor }]}>
                  {formatDate(notification.created_at)}
                </Text>
                {notification.is_read && (
                  <Check size={12} color={mutedColor} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 64,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  notificationCard: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 2,
    flexShrink: 0,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 12,
  },
});
