import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Box } from 'lucide-react-native';

interface Conversation {
  id: string;
  customer_name: string;
  last_message: string;
  timestamp: string;
  unread_count: number;
  status: 'open' | 'resolved';
  created_at: string;
}

interface ConversationsListProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onMarkAsRead?: (conversationId: string) => void;
  activeTab?: ChatTab;
  onTabChange?: (tab: ChatTab) => void;
}

type ChatTab = 'open' | 'newest' | 'resolved';

export function ConversationsList({ 
  conversations, 
  onSelectConversation, 
  onRefresh,
  refreshing = false,
  onMarkAsRead,
  activeTab: externalActiveTab,
  onTabChange 
}: ConversationsListProps) {
  const { isDarkMode } = useTheme();
  const [internalActiveTab, setInternalActiveTab] = useState<ChatTab>('open');
  
  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  
  const handleTabChange = (tab: ChatTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const hoverBg = isDarkMode ? '#1e293b' : '#f1f5f9';
  const brandColor = '#3b82f6';

  // Filter conversations based on active tab
  const filteredConversations = conversations.filter(conv => {
    const today = new Date();
    const convDate = new Date(conv.created_at);
    const isToday = convDate.toDateString() === today.toDateString();
    
    switch (activeTab) {
      case 'open':
        return conv.status !== 'resolved';
      case 'newest':
        return isToday;
      case 'resolved':
        return conv.status === 'resolved';
      default:
        return true;
    }
  });

  const openCount = conversations.filter(c => c.status !== 'resolved').length;
  const newestCount = conversations.filter(c => {
    const today = new Date();
    const convDate = new Date(c.created_at);
    return convDate.toDateString() === today.toDateString();
  }).length;
  const resolvedCount = conversations.filter(c => c.status === 'resolved').length;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.title, { color: textColor }]}>Inbox</Text>
        
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('open')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'open' ? { color: brandColor } : { color: mutedColor }
              ]}
            >
              Open{openCount > 0 ? ` (${openCount})` : ''}
            </Text>
            {activeTab === 'open' && (
              <View style={[styles.tabIndicator, { backgroundColor: brandColor }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('newest')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'newest' ? { color: brandColor } : { color: mutedColor }
              ]}
            >
              Newest{newestCount > 0 ? ` (${newestCount})` : ''}
            </Text>
            {activeTab === 'newest' && (
              <View style={[styles.tabIndicator, { backgroundColor: brandColor }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange('resolved')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'resolved' ? { color: brandColor } : { color: mutedColor }
              ]}
            >
              Resolved{resolvedCount > 0 ? ` (${resolvedCount})` : ''}
            </Text>
            {activeTab === 'resolved' && (
              <View style={[styles.tabIndicator, { backgroundColor: brandColor }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation List */}
      <ScrollView 
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColor}
            colors={[brandColor]}
          />
        }
      >
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Box size={48} color={mutedColor} style={styles.emptyIcon} />
            <Text style={[styles.emptyText, { color: textColor }]}>
              Oopsss nothing here
            </Text>
            <Text style={[styles.emptySubtext, { color: mutedColor }]}>
              {activeTab === 'open' && 'No open conversations today'}
              {activeTab === 'newest' && 'No new conversations today'}
              {activeTab === 'resolved' && 'No resolved conversations yet'}
            </Text>
          </View>
        ) : (
          filteredConversations.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              style={[styles.conversationItem, { borderBottomColor: borderColor }]}
              onPress={() => onSelectConversation(conv.id)}
              activeOpacity={0.7}
            >
              <View style={styles.conversationContent}>
                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: hoverBg },
                    conv.unread_count > 0 && {
                      borderWidth: 2,
                      borderColor: brandColor,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: mutedColor }]}>
                    {conv.customer_name?.slice(0, 2).toUpperCase() || 'U'}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.conversationDetails}>
                  <View style={styles.conversationHeader}>
                    <Text
                      style={[styles.customerName, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {conv.customer_name}
                    </Text>
                    <View style={styles.headerRight}>
                      <Text
                        style={[
                          styles.timestamp,
                          conv.unread_count > 0
                            ? { color: brandColor, fontWeight: '600' }
                            : { color: mutedColor },
                        ]}
                      >
                        {conv.timestamp}
                      </Text>
                      {/* Blue circle indicator for unread */}
                      {conv.unread_count > 0 && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            onMarkAsRead?.(conv.id);
                          }}
                          style={styles.unreadIndicator}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.unreadDot, { backgroundColor: brandColor }]} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text
                    style={[styles.lastMessage, { color: mutedColor }]}
                    numberOfLines={1}
                  >
                    {conv.last_message || 'No messages yet'}
                  </Text>
                </View>
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 16,
  },
  tab: {
    paddingBottom: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    minHeight: 200,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  conversationDetails: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  timestamp: {
    fontSize: 12,
  },
  unreadIndicator: {
    padding: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lastMessage: {
    fontSize: 12,
  },
});

