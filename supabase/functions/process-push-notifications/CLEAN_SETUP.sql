-- ============================================================================
-- CLEAN PUSH NOTIFICATION SETUP
-- ============================================================================
-- This script ONLY works with agent_device_tokens and push_notification_queue
-- NO triggers on messages table - notifications must be queued manually via API
-- ============================================================================

-- Step 1: Remove any existing triggers (DO NOT TOUCH MESSAGES TABLE)
DROP TRIGGER IF EXISTS trigger_push_notification_on_new_message ON messages;
DROP FUNCTION IF EXISTS trigger_push_notification();

-- Step 2: Ensure push_notification_queue has all required columns
ALTER TABLE push_notification_queue 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'New Message',
ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT 'You have a new message',
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_agent_id ON push_notification_queue(agent_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_status ON push_notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_created_at ON push_notification_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_push_notification_queue_pending ON push_notification_queue(status, created_at) WHERE status = 'pending';

-- Step 4: Enable RLS on push_notification_queue
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view their own queued notifications" ON push_notification_queue;
DROP POLICY IF EXISTS "Service role can manage all queued notifications" ON push_notification_queue;

-- Create RLS policies
CREATE POLICY "Agents can view their own queued notifications"
  ON push_notification_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = push_notification_queue.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all queued notifications"
  ON push_notification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Ensure agent_device_tokens table is properly set up
ALTER TABLE agent_device_tokens
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS device_token TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_device_tokens_device_token_key') THEN
    ALTER TABLE agent_device_tokens ADD CONSTRAINT agent_device_tokens_device_token_key UNIQUE (device_token);
  END IF;
END $$;

-- Step 6: Add indexes for agent_device_tokens
CREATE INDEX IF NOT EXISTS idx_agent_device_tokens_agent_id ON agent_device_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_device_tokens_active ON agent_device_tokens(is_active) WHERE is_active = true;

-- Step 7: Enable RLS on agent_device_tokens
ALTER TABLE agent_device_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can manage their own device tokens" ON agent_device_tokens;
DROP POLICY IF EXISTS "Service role can manage all device tokens" ON agent_device_tokens;

-- Create RLS policies
CREATE POLICY "Agents can manage their own device tokens"
  ON agent_device_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_device_tokens.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all device tokens"
  ON agent_device_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 8: Update trigger for updated_at (only for these tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_update_agent_device_tokens_updated_at ON agent_device_tokens;
CREATE TRIGGER trigger_update_agent_device_tokens_updated_at
  BEFORE UPDATE ON agent_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_push_notification_queue_updated_at ON push_notification_queue;
CREATE TRIGGER trigger_update_push_notification_queue_updated_at
  BEFORE UPDATE ON push_notification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add comments
COMMENT ON TABLE agent_device_tokens IS 'Stores device tokens for push notifications';
COMMENT ON TABLE push_notification_queue IS 'Queues push notifications for processing by Edge Function';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Check agent_device_tokens columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_device_tokens'
ORDER BY ordinal_position;

-- Check push_notification_queue columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'push_notification_queue'
ORDER BY ordinal_position;

-- Verify no triggers exist on messages table
SELECT trigger_name 
FROM information_schema.triggers 
WHERE table_name = 'messages' 
AND trigger_name LIKE '%push%';

