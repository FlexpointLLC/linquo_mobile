-- ============================================================================
-- SMART NOTIFICATION - Only latest message, only once
-- ============================================================================

-- Step 1: Clean up everything
DELETE FROM push_notification_queue;

-- Step 2: Drop existing trigger
DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages;
DROP FUNCTION IF EXISTS queue_push_notification();

-- Step 3: Create smart function that prevents duplicates
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  IF NEW.sender_type = 'CUSTOMER' THEN
    SELECT customer_id INTO v_customer_id
    FROM conversations
    WHERE id = NEW.conversation_id
    LIMIT 1;
    
    -- Only insert if:
    -- 1. Agent has a device token (no point queuing if they can't receive)
    -- 2. No pending notification exists for this agent in this conversation
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
    )
    -- No pending notification for this agent in this conversation
    AND NOT EXISTS (
      SELECT 1 FROM push_notification_queue pnq 
      WHERE pnq.agent_id = a.id 
      AND pnq.conversation_id = NEW.conversation_id
      AND pnq.status = 'pending'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the trigger
CREATE TRIGGER trigger_queue_push_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Step 5: Verify
SELECT 'Trigger created successfully' as status;

