export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
  organization_id: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
  is_ai_conversation: boolean;
  ai_taken_over_by: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  messages: Message[];
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'ai';
  sender_id: string | null;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  organization_id: string;
  created_at: string;
}

