-- ============================================================================
-- DEBUG TRIGGER - With detailed logging
-- ============================================================================

DELETE FROM push_notification_queue;

DROP TRIGGER IF EXISTS trigger_queue_push_notifications ON messages CASCADE;
DROP FUNCTION IF EXISTS queue_push_notification() CASCADE;

CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_assigned_agent_id UUID;
  v_deleted_count INT;
  v_inserted_count INT;
BEGIN
  IF NEW.sender_type = 'CUSTOMER' AND (NEW.read_by_agent IS NULL OR NEW.read_by_agent = false) THEN
    
    SELECT customer_id, assigned_agent_id INTO v_customer_id, v_assigned_agent_id
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    -- Delete old notifications and count them
    DELETE FROM push_notification_queue
    WHERE conversation_id = NEW.conversation_id
    AND status = 'pending';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old pending notifications for conversation %', v_deleted_count, NEW.conversation_id;
    
    -- Insert new notification
    WITH inserted AS (
      INSERT INTO push_notification_queue (
        agent_id, message_id, conversation_id, org_id, customer_id,
        notification_type, title, body, data, status, retry_count, max_retries
      )
      SELECT 
        a.id, NEW.id, NEW.conversation_id, NEW.org_id, v_customer_id,
        'new_message', 'New Message',
        COALESCE(SUBSTRING(NEW.body_text, 1, 100), 'You have a new message'),
        jsonb_build_object('message_id', NEW.id, 'conversation_id', NEW.conversation_id),
        'pending', 0, 3
      FROM agents a
      WHERE a.org_id = NEW.org_id
      AND a.is_active = true
      AND (v_assigned_agent_id IS NULL OR a.id = v_assigned_agent_id)
      AND EXISTS (
        SELECT 1 FROM agent_device_tokens adt 
        WHERE adt.agent_id = a.id AND adt.is_active = true
      )
      RETURNING *
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted;
    
    RAISE NOTICE 'Inserted % NEW notifications for message % with text: "%"', v_inserted_count, NEW.id, NEW.body_text;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_queue_push_notifications
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

SELECT 'Debug trigger created. Check logs after sending message.' as status;

