import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  BackHandler,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { BottomNavigation } from '../../components/dashboard/BottomNavigation';
import { ConversationsList } from '../../components/chat/ConversationsList';
import { MessageView } from '../../components/chat/MessageView';
import { CustomerInfoDrawer } from '../../components/chat/CustomerInfoDrawer';
import AnalyticsScreen from '../analytics/AnalyticsScreen';
import AISettingsScreen from '../ai/AISettingsScreen';
import CustomersScreen from '../customers/CustomersScreen';
import MoreScreen from '../more/MoreScreen';
import AgentsScreen from '../agents/AgentsScreen';
import SettingsScreen from '../settings/SettingsScreen';
import InstallationScreen from '../installation/InstallationScreen';
import NotificationsScreen from '../notifications/NotificationsScreen';
import { useConversations } from '../../hooks/useConversations';
import { useMessages } from '../../hooks/useMessages';
import { supabase } from '../../lib/supabase';

// Helper function to format timestamp
const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Helper function to format message time
const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function DashboardScreen() {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('chats');
  const [activeConversationTab, setActiveConversationTab] = useState<'open' | 'newest' | 'resolved'>('open');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';

  // Fetch conversations and messages
  const { conversations, loading: conversationsLoading, refresh: refreshConversations } = useConversations();
  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedConversationId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isTakingOver, setIsTakingOver] = useState(false);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleBackToConversations = () => {
    setSelectedConversationId(null);
    setHighlightedMessageId(null);
  };

  // Handle Android back button behavior
  useEffect(() => {
    const backAction = () => {
      // If viewing a conversation, go back to conversations list
      if (selectedConversationId) {
        handleBackToConversations();
        return true; // Prevent default behavior
      }

      // If viewing notifications, go back to main screen
      if (showNotifications) {
        setShowNotifications(false);
        return true; // Prevent default behavior
      }

      // If viewing customer info drawer, close it
      if (showCustomerInfo) {
        setShowCustomerInfo(false);
        return true; // Prevent default behavior
      }

      // If in a sub-screen (agents, settings, installation), go back to more tab
      if (['agents', 'settings', 'installation'].includes(activeTab)) {
        setActiveTab('more');
        return true; // Prevent default behavior
      }

      // If on home page (chats tab), implement "press back twice to exit"
      if (activeTab === 'chats') {
        if (backPressCount === 0) {
          setBackPressCount(1);
          // Reset counter after 2 seconds
          setTimeout(() => setBackPressCount(0), 2000);
          // Show native Android toast without icon
          ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
          return true; // Prevent default behavior
        } else {
          // Second back press - exit app
          BackHandler.exitApp();
          return true;
        }
      }

      // For other tabs, go to chats (home)
      setActiveTab('chats');
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [selectedConversationId, showNotifications, showCustomerInfo, activeTab, backPressCount]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send message: ' + error.message);
    }
  };

  const handleTakeOver = async () => {
    if (!selectedConversationId) return;

    try {
      setIsTakingOver(true);

      // Get current user and agent
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: agentData } = await supabase
        .from('agents')
        .select('id, display_name, org_id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) throw new Error('Agent not found');

      // Update conversation to mark takeover
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          ai_taken_over_by: agentData.id,
          ai_taken_over_at: new Date().toISOString(),
        })
        .eq('id', selectedConversationId);

      if (updateError) throw updateError;

      // Insert system message
      await supabase.from('messages').insert({
        conversation_id: selectedConversationId,
        sender_type: 'SYSTEM',
        body_text: `${agentData.display_name} has taken over the conversation`,
        org_id: agentData.org_id,
      });

      refreshConversations();
    } catch (error: any) {
      console.error('Error taking over conversation:', error);
      Alert.alert('Error', 'Failed to take over: ' + error.message);
    } finally {
      setIsTakingOver(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConversationId) return;

    try {
      setIsResolving(true);

      const conversation = conversations?.find(c => c.id === selectedConversationId);
      const currentState = conversation?.state || 'OPEN';
      const newState = currentState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const action = newState === 'CLOSED' ? 'resolved' : 'reopened';

      // Update conversation state
      const { error } = await supabase
        .from('conversations')
        .update({ state: newState })
        .eq('id', selectedConversationId);

      if (error) throw error;

      // Get agent info for system message
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: agentData } = await supabase
          .from('agents')
          .select('org_id')
          .eq('user_id', user.id)
          .single();

        if (agentData) {
          // Insert system message
          const systemMessage = newState === 'CLOSED' 
            ? 'Conversation resolved' 
            : 'Conversation opened again';
          
          await supabase.from('messages').insert({
            conversation_id: selectedConversationId,
            sender_type: 'SYSTEM',
            body_text: systemMessage,
            org_id: agentData.org_id,
          });
        }
      }
      
      // Go back to conversation list after resolving
      handleBackToConversations();
      refreshConversations();
    } catch (error: any) {
      console.error('Error resolving conversation:', error);
      Alert.alert('Error', 'Failed to update conversation: ' + error.message);
    } finally {
      setIsResolving(false);
    }
  };

  const handleInfo = () => {
    setShowCustomerInfo(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshConversations();
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAsRead = async (conversationId: string) => {
    try {
      // Mark all unread customer messages in this conversation as read
      const { error } = await supabase
        .from('messages')
        .update({ read_by_agent: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'CUSTOMER')
        .eq('read_by_agent', false);

      if (error) throw error;

      console.log('✅ Marked conversation as read:', conversationId);
    } catch (error: any) {
      console.error('Error marking conversation as read:', error);
      Alert.alert('Error', 'Failed to mark as read: ' + error.message);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chats':
        if (conversationsLoading && (!conversations || conversations.length === 0)) {
          return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.loadingText, { color: textColor }]}>Loading conversations...</Text>
            </View>
          );
        }

        if (selectedConversationId) {
          const conversation = conversations?.find(c => c.id === selectedConversationId);
          
          if (messagesLoading && messages.length === 0) {
            return (
              <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[styles.loadingText, { color: textColor }]}>Loading messages...</Text>
              </View>
            );
          }

          // Format messages for MessageView
          const formattedMessages = messages.map(msg => ({
            id: msg.id,
            content: msg.body_text,
            sender_type: msg.sender_type.toLowerCase() as 'customer' | 'agent' | 'ai' | 'system',
            sender_name: (() => {
              if (msg.sender_type === 'AGENT') return 'Agent';
              if (msg.sender_type === 'AI') return 'Bot';
              if (msg.sender_type === 'SYSTEM') return 'System';
              return conversation?.customers?.display_name || 'Customer';
            })(),
            created_at: msg.created_at,
            timestamp: formatMessageTime(msg.created_at),
          }));

          return (
            <>
              <MessageView
                conversationId={selectedConversationId}
                customerName={conversation?.customers?.display_name || 'Customer'}
                messages={formattedMessages}
                onBack={handleBackToConversations}
                onSendMessage={handleSendMessage}
                isAIConversation={conversation?.is_ai_conversation || false}
                isResolved={conversation?.state === 'CLOSED'}
                onTakeOver={conversation?.is_ai_conversation && !conversation?.ai_taken_over_by ? handleTakeOver : undefined}
                onResolve={handleResolve}
                onInfo={handleInfo}
                highlightedMessageId={highlightedMessageId}
                isResolvingLoading={isResolving}
                isTakeOverLoading={isTakingOver}
              />
              
              {/* Customer Info Drawer */}
              <CustomerInfoDrawer
                visible={showCustomerInfo}
                onClose={() => setShowCustomerInfo(false)}
                customerId={conversation?.customer_id || ''}
                customerName={conversation?.customers?.display_name || 'Customer'}
                customerEmail={conversation?.customers?.email || ''}
              />
            </>
          );
        }

        // Format conversations for ConversationsList
        const formattedConversations = (conversations || []).map(conv => ({
          id: conv.id,
          customer_name: conv.customers?.display_name || 'Unknown',
          last_message: conv.last_body_text || 'No messages yet',
          timestamp: formatTimestamp(conv.last_message_at || conv.created_at || new Date().toISOString()),
          unread_count: conv.unread || 0,
          status: conv.state === 'CLOSED' ? 'resolved' as const : 'open' as const,
          created_at: conv.created_at || new Date().toISOString(),
        }));

        return (
          <ConversationsList
            conversations={formattedConversations}
            onSelectConversation={handleSelectConversation}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            onMarkAsRead={handleMarkAsRead}
            activeTab={activeConversationTab}
            onTabChange={setActiveConversationTab}
          />
        );
          case 'analytics':
            return <AnalyticsScreen />;
          case 'ai':
            return <AISettingsScreen />;
          case 'customers':
        return <CustomersScreen />;
      case 'more':
        return <MoreScreen onNavigate={(tab) => setActiveTab(tab)} />;
        case 'agents':
          return <AgentsScreen onBack={() => setActiveTab('more')} />;
        case 'settings':
          return <SettingsScreen onBack={() => setActiveTab('more')} />;
        case 'installation':
          return <InstallationScreen onBack={() => setActiveTab('more')} />;
      default:
        return <Text style={[styles.text, { color: textColor }]}>Dashboard</Text>;
    }
  };

  // Hide bottom navigation when viewing a conversation
  const showBottomNav = !(activeTab === 'chats' && selectedConversationId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundColor}
      />
      
      {/* Hide header when viewing a conversation */}
      {!(activeTab === 'chats' && selectedConversationId) && !showNotifications && (
        <DashboardHeader
          onSelectConversation={(conversationId, messageId) => {
            setActiveTab('chats');
            setSelectedConversationId(conversationId);
            setHighlightedMessageId(messageId || null);
          }}
          onOpenNotifications={() => setShowNotifications(true)}
        />
      )}
      
      <View style={styles.content}>
        {showNotifications ? (
          <NotificationsScreen onBack={() => setShowNotifications(false)} />
        ) : (
          renderTabContent()
        )}
      </View>

      {showBottomNav && !showNotifications && (
        <BottomNavigation 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedConversationId(null); // Reset conversation when changing tabs
          }}
          hasUnreadMessages={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
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
});
