-- ============================================================================
-- UPDATED TRIGGER - Only ONE notification per agent per message
-- ============================================================================
-- This ensures each agent gets only ONE notification per new message
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages;
DROP FUNCTION IF EXISTS queue_push_notification();

-- Create updated function
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only process customer messages
  IF NEW.sender_type = 'CUSTOMER' THEN
    -- Get customer_id from conversation
    SELECT customer_id INTO v_customer_id
    FROM conversations
    WHERE id = NEW.conversation_id
    LIMIT 1;
    
    -- Insert notification for ALL active agents in the organization
    -- But only if they don't already have a notification for this message
    INSERT INTO push_notification_queue (
      agent_id,
      message_id,
      conversation_id,
      org_id,
      customer_id,
      notification_type,
      title,
      body,
      data,
      status,
      retry_count,
      max_retries
    )
    SELECT 
      a.id as agent_id,
      NEW.id as message_id,
      NEW.conversation_id as conversation_id,
      NEW.org_id as org_id,
      v_customer_id as customer_id,
      'new_message' as notification_type,
      'New Message' as title,
      COALESCE(SUBSTRING(NEW.body_text, 1, 100), 'You have a new message') as body,
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'customer_id', v_customer_id
      ) as data,
      'pending' as status,
      0 as retry_count,
      3 as max_retries
    FROM agents a
    WHERE a.org_id = NEW.org_id
    AND a.is_active = true
    -- Only create notification if one doesn't already exist for this agent and message
    AND NOT EXISTS (
      SELECT 1 
      FROM push_notification_queue pnq 
      WHERE pnq.agent_id = a.id 
      AND pnq.message_id = NEW.id
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insert
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_queue_push_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Verify trigger is created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'messages'
AND trigger_name LIKE '%push%'
ORDER BY trigger_name;

