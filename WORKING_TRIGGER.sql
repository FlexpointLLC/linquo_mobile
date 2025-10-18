-- ============================================================================
-- WORKING TRIGGER - No agent_id dependency
-- ============================================================================

-- Step 1: Delete ALL notifications
DELETE FROM push_notification_queue;

-- Step 2: Drop ALL triggers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        AND trigger_name LIKE '%push%'
        AND event_object_table = 'messages'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- Step 3: Drop all functions
DROP FUNCTION IF EXISTS queue_push_notification() CASCADE;
DROP FUNCTION IF EXISTS cancel_push_notification_on_read() CASCADE;

-- Step 4: Create simple working trigger
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_assigned_agent_id UUID;
BEGIN
  -- Only process NEW customer messages that are UNREAD
  IF NEW.sender_type = 'CUSTOMER' AND (NEW.read_by_agent IS NULL OR NEW.read_by_agent = false) THEN
    
    -- Get customer_id and assigned agent from conversation
    SELECT customer_id, assigned_agent_id INTO v_customer_id, v_assigned_agent_id
    FROM conversations
    WHERE id = NEW.conversation_id
    LIMIT 1;
    
    -- Delete OLD pending notifications for this conversation
    -- This ensures only the LATEST message is notified
    DELETE FROM push_notification_queue
    WHERE conversation_id = NEW.conversation_id
    AND status = 'pending';
    
    -- Insert ONE notification per agent with device token
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
      a.id,
      NEW.id,
      NEW.conversation_id,
      NEW.org_id,
      v_customer_id,
      'new_message',
      'New Message',
      COALESCE(SUBSTRING(NEW.body_text, 1, 100), 'You have a new message'),
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id
      ),
      'pending',
      0,
      3
    FROM agents a
    WHERE a.org_id = NEW.org_id
    AND a.is_active = true
    -- If conversation has assigned agent, only notify that agent
    -- Otherwise notify all agents (for new/unassigned conversations)
    AND (
      v_assigned_agent_id IS NULL 
      OR a.id = v_assigned_agent_id
    )
    -- Only for agents with device tokens
    AND EXISTS (
      SELECT 1 FROM agent_device_tokens adt 
      WHERE adt.agent_id = a.id 
      AND adt.is_active = true
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create the trigger
CREATE TRIGGER trigger_queue_push_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Step 6: Verify
SELECT 
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'messages'
AND trigger_name LIKE '%push%';

SELECT 'Trigger created! Widget should work now.' as status;

