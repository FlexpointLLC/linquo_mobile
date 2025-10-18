-- ============================================================================
-- REMOVE DUPLICATE PUSH NOTIFICATION TRIGGERS
-- ============================================================================
-- You have 2 duplicate triggers causing conflicts:
-- 1. trigger_push_notifications_on_message_insert
-- 2. trigger_queue_push_notifications
-- We'll keep ONE and remove the other
-- ============================================================================

-- Remove the duplicate triggers
DROP TRIGGER IF EXISTS trigger_push_notifications_on_message_insert ON messages;
DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages;
DROP TRIGGER IF EXISTS trigger_push_notification_on_new_message ON messages;

-- Remove their functions
DROP FUNCTION IF EXISTS trigger_push_notifications_on_message_insert();
DROP FUNCTION IF EXISTS trigger_queue_push_notifications();
DROP FUNCTION IF EXISTS trigger_push_notification();

-- ============================================================================
-- CREATE ONE CLEAN TRIGGER
-- ============================================================================

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
    AND a.is_active = true;
    
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

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'messages'
AND trigger_name LIKE '%push%'
ORDER BY trigger_name;

