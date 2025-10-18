-- ============================================================================
-- FINAL SMART TRIGGER - Perfect Push Notifications
-- ============================================================================
-- Features:
-- 1. Shows the LATEST message text
-- 2. Only sends if message is NOT read by agent
-- 3. Deletes old pending notifications for same conversation
-- 4. Only ONE notification per conversation
-- ============================================================================

-- Step 1: Clean up everything
DELETE FROM push_notification_queue;

-- Step 2: Drop existing trigger
DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages;
DROP FUNCTION IF EXISTS queue_push_notification();

-- Step 3: Create the perfect function
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only process customer messages that haven't been read by agent
  IF NEW.sender_type = 'CUSTOMER' AND (NEW.read_by_agent IS NULL OR NEW.read_by_agent = false) THEN
    
    -- Get customer_id from conversation
    SELECT customer_id INTO v_customer_id
    FROM conversations
    WHERE id = NEW.conversation_id
    LIMIT 1;
    
    -- Delete any pending notifications for this conversation
    -- This ensures we only notify about the LATEST message
    DELETE FROM push_notification_queue
    WHERE conversation_id = NEW.conversation_id
    AND status = 'pending';
    
    -- Insert new notification for the LATEST message
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
    -- Only for agents with device tokens
    AND EXISTS (
      SELECT 1 FROM agent_device_tokens adt 
      WHERE adt.agent_id = a.id AND adt.is_active = true
    );
    
    RAISE NOTICE 'Push notification queued for message: % with text: %', NEW.id, NEW.body_text;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger for INSERT
CREATE TRIGGER trigger_queue_push_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Step 5: Create function to cancel notifications when message is read
CREATE OR REPLACE FUNCTION cancel_push_notification_on_read()
RETURNS TRIGGER AS $$
BEGIN
  -- When message is marked as read by agent, cancel pending notifications
  IF NEW.read_by_agent = true AND (OLD.read_by_agent IS NULL OR OLD.read_by_agent = false) THEN
    
    -- Mark notifications as sent to prevent them from being delivered
    UPDATE push_notification_queue
    SET status = 'sent', 
        processed_at = NOW(),
        error_message = 'Cancelled - message was read'
    WHERE message_id = NEW.id
    AND status = 'pending';
    
    RAISE NOTICE 'Cancelled push notification for read message: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for UPDATE (when message is marked as read)
DROP TRIGGER IF EXISTS trigger_cancel_notification_on_read ON messages;
CREATE TRIGGER trigger_cancel_notification_on_read
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cancel_push_notification_on_read();

-- Step 7: Verify
SELECT 
  trigger_name, 
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'messages'
AND trigger_name LIKE '%notification%'
ORDER BY trigger_name;

