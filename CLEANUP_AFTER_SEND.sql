-- ============================================================================
-- CLEANUP SCRIPT - Mark old notifications as sent
-- ============================================================================
-- Run this to clean up any old pending notifications
-- ============================================================================

-- Mark all old pending notifications as sent (older than 5 minutes)
UPDATE push_notification_queue
SET status = 'sent', processed_at = NOW()
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '5 minutes';

-- Show what's left
SELECT status, COUNT(*) 
FROM push_notification_queue 
GROUP BY status;

