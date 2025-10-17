import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { Search, X, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  id: string;
  conversation_id: string;
  body_text: string;
  created_at: string;
  sender_type: 'AGENT' | 'CUSTOMER' | 'SYSTEM' | 'AI';
  agent_id: string | null;
  customer_id: string | null;
  customer_name?: string;
  customer_email?: string;
  agent_name?: string;
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string, messageId: string) => void;
}

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function SearchModal({ visible, onClose, onSelectConversation }: SearchModalProps) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentOrgId, setAgentOrgId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const backgroundColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const inputBg = isDarkMode ? '#1e293b' : '#f8fafc';

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      loadAgentData();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setQuery('');
      setResults([]);
    }
  }, [visible, fadeAnim]);

  const loadAgentData = async () => {
    if (!user?.id) return;
    
    try {
      const { data: agentData, error } = await supabase
        .from('agents')
        .select('org_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      setAgentOrgId(agentData.org_id);
    } catch (error) {
      console.error('Error loading agent data:', error);
    }
  };

  const searchMessages = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !agentOrgId) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const limit = 20;

      // Search for messages with conversation details
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(
            customer_id
          )
        `)
        .eq('org_id', agentOrgId)
        .ilike('body_text', `%${searchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!messages || messages.length === 0) {
        setResults([]);
        return;
      }

      // Get unique customer IDs and agent IDs
      const customerIds = [...new Set(
        messages
          .map((m: any) => m.conversations?.customer_id)
          .filter(Boolean)
      )];
      
      const agentIds = [...new Set(
        messages
          .map((m: any) => m.agent_id)
          .filter(Boolean)
      )];

      // Fetch customer data
      let customerMap = new Map<string, { display_name: string; email: string }>();
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, display_name, email')
          .in('id', customerIds);
        
        if (customers) {
          customers.forEach((c: any) => {
            customerMap.set(c.id, { display_name: c.display_name, email: c.email });
          });
        }
      }

      // Fetch agent data
      let agentMap = new Map<string, string>();
      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from('agents')
          .select('id, display_name')
          .in('id', agentIds);
        
        if (agents) {
          agents.forEach((a: any) => {
            agentMap.set(a.id, a.display_name);
          });
        }
      }

      // Map results with customer and agent details
      const enrichedResults: SearchResult[] = messages.map((msg: any) => {
        const customerId = msg.conversations?.customer_id;
        const customer = customerId ? customerMap.get(customerId) : undefined;
        const agentName = msg.agent_id ? agentMap.get(msg.agent_id) : undefined;

        return {
          id: msg.id,
          conversation_id: msg.conversation_id,
          body_text: msg.body_text,
          created_at: msg.created_at,
          sender_type: msg.sender_type,
          agent_id: msg.agent_id,
          customer_id: msg.customer_id,
          customer_name: customer?.display_name,
          customer_email: customer?.email,
          agent_name: agentName,
        };
      });

      setResults(enrichedResults);
    } catch (error) {
      console.error('Error searching messages:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [agentOrgId]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchMessages(query);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchMessages]);

  const handleSelectResult = (conversationId: string, messageId: string) => {
    onSelectConversation(conversationId, messageId);
    onClose();
  };

  const getSenderLabel = (result: SearchResult) => {
    if (result.sender_type === 'CUSTOMER') {
      return result.customer_name || 'Customer';
    } else if (result.sender_type === 'AGENT') {
      return result.agent_name || 'Agent';
    } else if (result.sender_type === 'AI') {
      return 'Bot';
    } else {
      return 'System';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayPressable} onPress={onClose} />
        
        <View style={[styles.modalContainer, { backgroundColor }]}>
          {/* Search Header */}
          <View style={[styles.searchHeader, { borderBottomColor: borderColor }]}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color={mutedColor} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search messages..."
                placeholderTextColor={mutedColor}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {loading && <ActivityIndicator size="small" color={mutedColor} />}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={mutedColor} />
            </TouchableOpacity>
          </View>

          {/* Results */}
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            {query.trim() === '' && (
              <View style={styles.emptyState}>
                <Search size={48} color={mutedColor} opacity={0.3} />
                <Text style={[styles.emptyText, { color: mutedColor }]}>
                  Type to search messages
                </Text>
              </View>
            )}

            {query.trim() !== '' && results.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <MessageSquare size={48} color={mutedColor} opacity={0.3} />
                <Text style={[styles.emptyText, { color: mutedColor }]}>
                  No messages found
                </Text>
              </View>
            )}

            {results.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={[styles.resultItem, { borderBottomColor: borderColor }]}
                onPress={() => handleSelectResult(result.conversation_id, result.id)}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultHeaderLeft}>
                    <MessageSquare size={16} color={mutedColor} />
                    <Text style={[styles.resultSender, { color: textColor }]}>
                      {getSenderLabel(result)}
                    </Text>
                  </View>
                  <Text style={[styles.resultTime, { color: mutedColor }]}>
                    {timeAgo(result.created_at)}
                  </Text>
                </View>
                <Text style={[styles.resultText, { color: textColor }]} numberOfLines={2}>
                  {result.body_text}
                </Text>
                {result.customer_name && (
                  <Text style={[styles.resultCustomer, { color: mutedColor }]}>
                    {result.customer_name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  overlayPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  closeButton: {
    padding: 4,
  },
  resultsContainer: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultSender: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultTime: {
    fontSize: 12,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultCustomer: {
    fontSize: 12,
  },
});

