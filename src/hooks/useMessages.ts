import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type DbMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'CUSTOMER' | 'AGENT' | 'AI' | 'SYSTEM';
  agent_id: string | null;
  customer_id: string | null;
  body_text: string;
  created_at: string;
  read_by_agent: boolean;
  read_at: string | null;
};

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<{ id: string; org_id: string } | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) {
      setMessages([]);
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

      // Fetch messages
      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_type,agent_id,customer_id,body_text,created_at,read_by_agent,read_at')
        .eq('conversation_id', conversationId)
        .eq('org_id', agentData.org_id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const messages = (data as DbMessage[]).map(msg => ({
        ...msg,
        read_by_agent: msg.read_by_agent ?? false,
        read_at: msg.read_at ?? null
      }));

      setMessages(messages);

      // Mark unread customer messages as read
      const unreadCustomerMessages = messages.filter(
        msg => msg.sender_type === 'CUSTOMER' && !msg.read_by_agent
      );

      if (unreadCustomerMessages.length > 0) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ read_by_agent: true, read_at: new Date().toISOString() })
          .in('id', unreadCustomerMessages.map(msg => msg.id));

        if (updateError) {
          console.error('Error marking messages as read:', updateError);
        } else {
          // Update local state to reflect read status
          setMessages(prev => 
            prev.map(msg => 
              unreadCustomerMessages.some(u => u.id === msg.id)
                ? { ...msg, read_by_agent: true, read_at: new Date().toISOString() }
                : msg
            )
          );
        }
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as DbMessage;
          console.log('📨 New message received:', newMessage.sender_type, newMessage.body_text);

          setMessages(prev => {
            // Check if message already exists
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;

            // Add new message and sort by created_at
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });

          // If it's a customer message, mark it as read immediately
          if (newMessage.sender_type === 'CUSTOMER') {
            supabase
              .from('messages')
              .update({ read_by_agent: true, read_at: new Date().toISOString() })
              .eq('id', newMessage.id)
              .then(({ error }) => {
                if (error) {
                  console.error('Error marking new message as read:', error);
                } else {
                  // Update local state
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === newMessage.id
                        ? { ...msg, read_by_agent: true, read_at: new Date().toISOString() }
                        : msg
                    )
                  );
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !agent) {
      throw new Error('Cannot send message: no conversation or agent');
    }

    try {
      // Insert message
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          body_text: content,
          sender_type: 'AGENT',
          agent_id: agent.id,
          org_id: agent.org_id,
          read_by_agent: true,
          read_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

    } catch (err: any) {
      console.error('Error sending message:', err);
      throw err;
    }
  }, [conversationId, agent]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refresh: fetchMessages,
  };
}
