-- Enable the http extension first
CREATE EXTENSION IF NOT EXISTS http;

-- Function to trigger push notifications when new customer messages are inserted
CREATE OR REPLACE FUNCTION trigger_push_notifications()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
BEGIN
  -- Only trigger for customer messages
  IF NEW.sender_type = 'CUSTOMER' THEN
    -- Get the Edge Function URL (using your actual Supabase URL)
    edge_function_url := 'https://vzoteejdvffrdjprfpad.supabase.co/functions/v1/process-push-notifications';
    
    -- Prepare the payload
    payload := jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'message_id', NEW.id,
      'org_id', NEW.org_id
    );
    
    -- Call the Edge Function asynchronously using the correct http function
    PERFORM http_post(
      edge_function_url,
      payload::text,
      'application/json'
    );
    
    RAISE LOG 'Push notification triggered for message %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_push_notifications_on_message_insert ON messages;
CREATE TRIGGER trigger_push_notifications_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_notifications();
