-- ============================================================================
-- PUSH NOTIFICATION TRIGGER SETUP
-- ============================================================================
-- This creates a trigger that automatically queues push notifications
-- when new customer messages are received
-- ============================================================================

-- Function to trigger push notifications
CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Only send notifications for customer messages
  IF NEW.sender_type = 'CUSTOMER' THEN
    -- Prepare the payload
    payload := json_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id
    );
    
    -- Insert notification into queue
    INSERT INTO push_notification_queue (
      agent_id,
      message_id,
      conversation_id,
      org_id,
      customer_id,
      title,
      body,
      data,
      status,
      max_retries
    )
    SELECT 
      a.id as agent_id,
      NEW.id as message_id,
      NEW.conversation_id as conversation_id,
      NEW.org_id as org_id,
      NEW.customer_id as customer_id,
      'New Message' as title,
      COALESCE(NEW.body_text, 'You have a new message') as body,
      payload as data,
      'pending' as status,
      3 as max_retries
    FROM agents a
    WHERE a.org_id = NEW.org_id
    AND a.is_active = true;
    
    RAISE NOTICE 'Push notification queued for message: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_push_notification_on_new_message ON messages;

-- Create trigger to call the function after a new message is inserted
CREATE TRIGGER trigger_push_notification_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notification();

-- Add comments for documentation
COMMENT ON FUNCTION trigger_push_notification() IS 'Triggers push notifications when a new customer message is received';
COMMENT ON TRIGGER trigger_push_notification_on_new_message ON messages IS 'Calls function to queue push notifications for new customer messages';
