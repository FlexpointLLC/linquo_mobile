-- ============================================================================
-- COMPLETE FIX FOR PUSH NOTIFICATION QUEUE
-- ============================================================================
-- This script fixes all missing columns and updates the trigger
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Add all missing columns to push_notification_queue
ALTER TABLE push_notification_queue 
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Step 2: Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_message_id ON push_notification_queue(message_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_conversation_id ON push_notification_queue(conversation_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_org_id ON push_notification_queue(org_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_customer_id ON push_notification_queue(customer_id);

-- Step 3: Update comments
COMMENT ON COLUMN push_notification_queue.message_id IS 'Reference to the message that triggered this notification';
COMMENT ON COLUMN push_notification_queue.conversation_id IS 'Reference to the conversation';
COMMENT ON COLUMN push_notification_queue.org_id IS 'Reference to the organization';
COMMENT ON COLUMN push_notification_queue.customer_id IS 'Reference to the customer who sent the message';

-- Step 4: Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_push_notification_on_new_message ON messages;
DROP FUNCTION IF EXISTS trigger_push_notification();

-- Step 5: Create the updated trigger function
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

-- Step 6: Recreate the trigger
CREATE TRIGGER trigger_push_notification_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notification();

-- Step 7: Add comments for documentation
COMMENT ON FUNCTION trigger_push_notification() IS 'Triggers push notifications when a new customer message is received';
COMMENT ON TRIGGER trigger_push_notification_on_new_message ON messages IS 'Calls function to queue push notifications for new customer messages';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify everything is correct:

-- Check push_notification_queue columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'push_notification_queue'
ORDER BY ordinal_position;

-- Check if trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_push_notification_on_new_message';

