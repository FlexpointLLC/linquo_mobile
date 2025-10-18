-- ============================================================================
-- CLEANUP OLD NOTIFICATIONS
-- ============================================================================
-- This removes old/duplicate notifications so you start fresh
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Option 1: Delete ALL old notifications (start fresh)
DELETE FROM push_notification_queue;

-- Option 2: Only delete failed/processed notifications (keep pending)
-- DELETE FROM push_notification_queue 
-- WHERE status IN ('sent', 'failed');

-- Verify cleanup
SELECT 
  status, 
  COUNT(*) as count 
FROM push_notification_queue 
GROUP BY status;

