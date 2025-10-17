import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type Conversation = {
  id: string;
  customer_id: string;
  last_message_at: string | null;
  state?: 'OPEN' | 'CLOSED';
  created_at?: string;
  unread?: number;
  last_body_text?: string;
  is_ai_conversation?: boolean;
  ai_taken_over_by?: string | null;
  ai_taken_over_at?: string | null;
  customers: {
    id: string;
    display_name: string;
    email: string;
  } | null;
};

export function useConversations() {
  const { user } = useAuth();
  const [data, setData] = useState<Conversation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<{ id: string; org_id: string } | null>(null);
  const processedMessageIds = new Set<string>(); // Track messages we've already processed

  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get agent data
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id, org_id')
        .eq('user_id', user.id)
        .single();

      if (agentError) throw agentError;
      if (!agentData) throw new Error('Agent not found');

      setAgent(agentData);

      // Get conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id,customer_id,last_message_at,state,created_at,is_ai_conversation,ai_taken_over_by,ai_taken_over_at')
        .eq('org_id', agentData.org_id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(30);

      if (convError) throw convError;

      // Get customer data for all conversations
      const customerIds = conversations?.map(c => c.customer_id).filter(Boolean) || [];
      let customerData: { id: string; display_name: string; email: string; unread_count_agent?: number }[] = [];

      if (customerIds.length > 0) {
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id,display_name,email,unread_count_agent')
          .in('id', customerIds);

        if (!customerError && customers) {
          customerData = customers;
        }
      }

      // Get last message for each conversation
      const conversationIds = conversations?.map(c => c.id).filter(Boolean) || [];
      const lastMessagesMap = new Map<string, { body_text: string; created_at: string }>();

      if (conversationIds.length > 0) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('conversation_id, body_text, created_at')
          .in('conversation_id', conversationIds)
          .eq('org_id', agentData.org_id)
          .order('created_at', { ascending: false });

        if (!messagesError && messages) {
          messages.forEach((message) => {
            if (!lastMessagesMap.has(message.conversation_id)) {
              lastMessagesMap.set(message.conversation_id, {
                body_text: message.body_text,
                created_at: message.created_at
              });
            }
          });
        }
      }

      // Combine the data
      const combinedData = conversations?.map(conv => {
        const customer = customerData.find(c => c.id === conv.customer_id);
        const lastMessage = lastMessagesMap.get(conv.id);
        return {
          ...conv,
          customers: customer || null,
          unread: customer?.unread_count_agent || 0,
          last_body_text: lastMessage?.body_text || undefined
        };
      }) || [];

      // Sort by last_message_at
      combinedData.sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

      setData(combinedData);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user?.id) return;

    // Set up real-time subscription for messages
    const messageChannel = supabase
      .channel(`message_changes_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          console.log('📨 New message detected:', payload.new);

          if (payload.new && payload.new.conversation_id) {
            setData(prevData => {
              if (!prevData) return prevData;

              const updatedData = [...prevData];
              const conversationIndex = updatedData.findIndex(
                conv => conv.id === payload.new.conversation_id
              );

              if (conversationIndex !== -1) {
                const conversation = updatedData[conversationIndex];
                conversation.last_message_at = payload.new.created_at;
                conversation.last_body_text = payload.new.body_text;

                // If it's a customer message, increment unread count
                if (payload.new.sender_type === 'CUSTOMER') {
                  const oldUnread = conversation.unread || 0;
                  conversation.unread = oldUnread + 1;
                  console.log('📈 Incremented unread count for conversation:', conversation.id, 'Old:', oldUnread, 'New:', conversation.unread);
                }

                updatedData.splice(conversationIndex, 1);
                updatedData.unshift(conversation);

                return updatedData;
              } else {
                // Conversation not found in list - refresh to get it
                console.log('🔍 Conversation not found in list, refreshing:', payload.new.conversation_id);
                fetchConversations();
              }

              return prevData;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload: any) => {
          console.log('📝 Message updated:', payload.new.id, 'Read by agent:', payload.new.read_by_agent);

          // If a customer message is marked as read, decrement unread count
          // Only process each message once to avoid double-decrementing
          if (
            payload.new && 
            payload.new.sender_type === 'CUSTOMER' && 
            payload.new.read_by_agent === true &&
            !processedMessageIds.has(payload.new.id)
          ) {
            processedMessageIds.add(payload.new.id);
            
            setData(prevData => {
              if (!prevData) return prevData;

              return prevData.map(conv => {
                if (conv.id === payload.new.conversation_id) {
                  const newUnreadCount = Math.max(0, (conv.unread || 0) - 1);
                  console.log('📉 Decremented unread count for conversation:', conv.id, 'New count:', newUnreadCount);
                  return { ...conv, unread: newUnreadCount };
                }
                return conv;
              });
            });
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for new conversations
    const conversationChannel = supabase
      .channel('conv_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload: any) => {
          console.log('🔄 New conversation detected:', payload.new);

          // Only process conversations for the current organization
          if (!agent || payload.new.org_id !== agent.org_id) {
            console.log('🔄 Ignoring conversation from different org');
            return;
          }

          // Auto-refresh the entire conversation list to ensure everything is in sync
          console.log('🔄 Auto-refreshing conversation list...');
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(conversationChannel);
    };
  }, [fetchConversations, user]);

  return {
    conversations: data,
    loading,
    error,
    refresh: fetchConversations,
  };
}
