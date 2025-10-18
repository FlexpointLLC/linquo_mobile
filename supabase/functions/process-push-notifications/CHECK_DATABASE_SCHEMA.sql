-- ============================================================================
-- DATABASE SCHEMA CHECKER
-- ============================================================================
-- Run this to see all tables and their columns in your Supabase database
-- ============================================================================

-- List all tables in the public schema
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Get all columns for all tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Specific check for messages table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Specific check for agent_device_tokens table (if exists)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_device_tokens'
ORDER BY ordinal_position;

-- Specific check for push_notification_queue table (if exists)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'push_notification_queue'
ORDER BY ordinal_position;

-- Specific check for push_notifications table (if exists)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'push_notifications'
ORDER BY ordinal_position;

-- Check all existing triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
