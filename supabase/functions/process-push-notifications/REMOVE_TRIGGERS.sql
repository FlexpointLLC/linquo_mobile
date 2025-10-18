-- ============================================================================
-- REMOVE ALL PUSH NOTIFICATION TRIGGERS
-- ============================================================================
-- This removes all triggers so they don't interfere with existing tables
-- ============================================================================

-- Remove trigger from messages table
DROP TRIGGER IF EXISTS trigger_push_notification_on_new_message ON messages;

-- Remove trigger function
DROP FUNCTION IF EXISTS trigger_push_notification();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify trigger is removed
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_push_notification_on_new_message';

-- Should return no rows

