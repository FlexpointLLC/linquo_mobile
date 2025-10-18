-- ============================================================================
-- NOTIFY ONLY ASSIGNED AGENT
-- ============================================================================
-- Only notifies the agent assigned to the conversation
-- If no agent assigned, notifies all agents (for new conversations)
-- ============================================================================

-- Step 1: Clean up
DELETE FROM push_notification_queue;

-- Step 2: Drop existing triggers
DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages;
DROP TRIGGER IF EXISTS trigger_cancel_notification_on_read ON messages;
DROP FUNCTION IF EXISTS queue_push_notification();
DROP FUNCTION IF EXISTS cancel_push_notification_on_read();

-- Step 3: Create smart function - only notify assigned agent
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_assigned_agent_id UUID;
BEGIN
  -- Only process customer messages that haven't been read
  IF NEW.sender_type = 'CUSTOMER' AND (NEW.read_by_agent IS NULL OR NEW.read_by_agent = false) THEN
    
    -- Get customer_id and assigned agent from conversation
    SELECT customer_id, agent_id INTO v_customer_id, v_assigned_agent_id
    FROM conversations
    WHERE id = NEW.conversation_id
    LIMIT 1;
    
    -- Delete any pending notifications for this conversation
    DELETE FROM push_notification_queue
    WHERE conversation_id = NEW.conversation_id
    AND status = 'pending';
    
    -- Insert notification
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
    -- If conversation has assigned agent, only notify that agent
    -- Otherwise notify all agents with tokens (for round-robin/new conversations)
    AND (
      v_assigned_agent_id IS NULL 
      OR a.id = v_assigned_agent_id
    )
    -- Only for agents with device tokens
    AND EXISTS (
      SELECT 1 FROM agent_device_tokens adt 
      WHERE adt.agent_id = a.id AND adt.is_active = true
    );
    
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
  IF NEW.read_by_agent = true AND (OLD.read_by_agent IS NULL OR OLD.read_by_agent = false) THEN
    UPDATE push_notification_queue
    SET status = 'sent', 
        processed_at = NOW(),
        error_message = 'Cancelled - message was read'
    WHERE message_id = NEW.id
    AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for UPDATE
CREATE TRIGGER trigger_cancel_notification_on_read
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION cancel_push_notification_on_read();

-- Step 7: Verify
SELECT 'Triggers created successfully' as status;

