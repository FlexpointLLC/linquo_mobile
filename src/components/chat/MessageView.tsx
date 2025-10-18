import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, UserCheck, Check, Info, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTypingIndicator } from '../../hooks/useTypingIndicator';
import { useAuth } from '../../hooks/useAuth';

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'agent' | 'ai' | 'system';
  sender_name: string;
  created_at: string;
  timestamp: string;
}

interface MessageViewProps {
  conversationId: string;
  customerName: string;
  messages: Message[];
  onBack: () => void;
  onSendMessage: (content: string) => void;
  isAIConversation?: boolean;
  isResolved?: boolean;
  onTakeOver?: () => void;
  onResolve?: () => void;
  onInfo?: () => void;
  isResolvingLoading?: boolean;
  isTakeOverLoading?: boolean;
  highlightedMessageId?: string | null;
}

const INPUT_BAR_HEIGHT = 64;

export function MessageView({
  conversationId,
  customerName,
  messages,
  onBack,
  onSendMessage,
  isAIConversation = false,
  isResolved = false,
  onTakeOver,
  onResolve,
  onInfo,
  isResolvingLoading = false,
  isTakeOverLoading = false,
  highlightedMessageId = null,
}: MessageViewProps) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [showHighlight, setShowHighlight] = useState(true);
  const [hasScrolledToMessage, setHasScrolledToMessage] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (flatListRef.current && allItems.length > 0) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      });
    }
  };

  // Typing indicator
  const { typingUsers, handleTypingStart, handleTypingStop } = useTypingIndicator(
    conversationId,
    user?.id || '',
    'agent'
  );

  // Track keyboard events for auto-scroll and height management
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto-scroll to bottom when keyboard appears
        scrollToBottom();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        // Auto-scroll to bottom when keyboard hides
        scrollToBottom();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const inputBg = isDarkMode ? '#1e293b' : '#f1f5f9';
  const customerBubbleBg = isDarkMode ? '#1e293b' : '#f1f5f9';
  const agentBubbleBg = '#3b82f6';
  const systemBubbleBg = isDarkMode ? '#1e293b' : '#f1f5f9';
  const buttonBg = isDarkMode ? '#1e293b' : '#f1f5f9';

  // Scroll to highlighted message from search
  useEffect(() => {
    if (highlightedMessageId && messages.length > 0 && !hasScrolledToMessage) {
      const messageIndex = messages.findIndex(m => m.id === highlightedMessageId);
      if (messageIndex !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: messageIndex,
            animated: true,
            viewPosition: 0.5, // Center the message
          });
          setHasScrolledToMessage(true);
        }, 300);
      }
    }
  }, [highlightedMessageId, messages, hasScrolledToMessage]);

  // Reset scroll flag and show highlight when message ID changes
  useEffect(() => {
    setHasScrolledToMessage(false);
    setShowHighlight(true);
    
    // Remove highlight after 5 seconds
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setShowHighlight(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  // Auto-scroll to bottom when messages change (but not when highlighting)
  useEffect(() => {
    if (!highlightedMessageId) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, typingUsers.length, highlightedMessageId]);

  const handleSend = useCallback(() => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim());
      setMessageText('');
      handleTypingStop();
    }
  }, [messageText, onSendMessage, handleTypingStop]);

  // Combine messages and typing indicators for FlatList
  const allItems = [
    ...messages,
    ...typingUsers.map((tu) => ({
      id: `typing-${tu.id}`,
      content: '',
      sender_type: tu.type as 'customer' | 'agent',
      sender_name: tu.name,
      created_at: '',
      timestamp: '',
      isTyping: true,
    })),
  ];

  const renderMessage = ({ item }: { item: any }) => {
    // Typing indicator
    if (item.isTyping) {
      const isAgent = item.sender_type === 'agent';
      return (
        <View
          style={[
            styles.messageContainer,
            isAgent ? styles.agentMessage : styles.customerMessage,
          ]}
        >
          <View
            style={[
              styles.typingBubble,
              { backgroundColor: isAgent ? agentBubbleBg : customerBubbleBg },
            ]}
          >
            <View style={styles.typingDotsContainer}>
              <View style={[styles.typingDot, { backgroundColor: isAgent ? '#ffffff' : textColor }]} />
              <View style={[styles.typingDot, { backgroundColor: isAgent ? '#ffffff' : textColor }]} />
              <View style={[styles.typingDot, { backgroundColor: isAgent ? '#ffffff' : textColor }]} />
            </View>
            <Text style={[styles.typingText, { color: isAgent ? '#ffffff' : mutedColor }]}>
              {item.sender_name} is typing...
            </Text>
          </View>
        </View>
      );
    }

    // System messages
    if (item.sender_type === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBubble, { backgroundColor: systemBubbleBg, borderColor }]}>
            <Text style={[styles.systemMessageText, { color: mutedColor }]}>
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    // Regular messages
    const isCustomer = item.sender_type === 'customer';
    const isHighlighted = highlightedMessageId === item.id && showHighlight;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isCustomer ? styles.customerMessage : styles.agentMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            { backgroundColor: isCustomer ? customerBubbleBg : agentBubbleBg },
            isHighlighted && styles.highlightedMessage,
          ]}
        >
          <Text style={[styles.senderName, { color: isCustomer ? textColor : '#ffffff' }]}>
            {item.sender_name}
          </Text>
          <Text style={[styles.messageText, { color: isCustomer ? textColor : '#ffffff' }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: isCustomer ? mutedColor : 'rgba(255,255,255,0.7)' }]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: mutedColor }]}>
            Customer
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {/* Take Over Button */}
          {isAIConversation && onTakeOver && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
              onPress={onTakeOver}
              disabled={isTakeOverLoading}
            >
              {isTakeOverLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <UserCheck size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
          )}
          
          {/* Resolve Button */}
          {onResolve && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: buttonBg, borderWidth: 1, borderColor }]}
              onPress={onResolve}
              disabled={isResolvingLoading}
            >
              {isResolvingLoading ? (
                <ActivityIndicator size="small" color={textColor} />
              ) : isResolved ? (
                <RotateCcw size={16} color={textColor} />
              ) : (
                <Check size={16} color={textColor} />
              )}
            </TouchableOpacity>
          )}
          
          {/* Info Button */}
          {onInfo && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: buttonBg, borderWidth: 1, borderColor }]}
              onPress={onInfo}
            >
              <Info size={16} color={textColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resolved Badge */}
      {isResolved && (
        <View style={[styles.resolvedBadge, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderBottomColor: borderColor }]}>
          <View style={[styles.resolvedBadgeContent, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor }]}>
            <Check size={14} color="#10b981" />
            <Text style={[styles.resolvedBadgeText, { color: textColor }]}>
              This conversation is resolved
            </Text>
          </View>
        </View>
      )}

      {/* KeyboardAvoidingView wraps the entire layout */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* Messages FlatList - Takes remaining space */}
        <FlatList
          ref={flatListRef}
          data={allItems}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesContainer}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 12 + 16,
            paddingHorizontal: 16,
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Composer - Fixed at bottom, no absolute positioning */}
        <View
          style={[
            styles.composerWrap,
            {
              paddingBottom: Platform.OS === 'ios' ? insets.bottom - 16 : 16,
              borderTopColor: borderColor,
              backgroundColor,
              // For Android: when keyboard is open, add keyboard height to composer height + bottom padding
              ...(Platform.OS === 'android' && keyboardHeight > 0 && {
                height: keyboardHeight + 64 + 16, // 64 is base composer height + 16 is bottom padding
              }),
            },
          ]}
        >
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor, color: textColor }]}
          placeholder="Type a message..."
          placeholderTextColor={mutedColor}
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            if (text.trim()) {
              handleTypingStart();
            } else {
              handleTypingStop();
            }
          }}
          onBlur={handleTypingStop}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: agentBubbleBg }]}
          onPress={handleSend}
          disabled={!messageText.trim()}
        >
          <Send size={20} color="#ffffff" />
        </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resolvedBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  resolvedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 6,
  },
  customerMessage: {
    alignSelf: 'flex-start',
  },
  agentMessage: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
  },
  highlightedMessage: {
    borderWidth: 2,
    borderColor: '#fbbf24', // Yellow-400
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  systemMessageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  systemMessageText: {
    fontSize: 12,
    textAlign: 'center',
  },
  typingBubble: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  messagesContainer: {
    flex: 1,
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
