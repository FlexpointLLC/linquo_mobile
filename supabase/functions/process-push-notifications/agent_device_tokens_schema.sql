-- ============================================================================
-- AGENT DEVICE TOKENS TABLE SCHEMA
-- ============================================================================
-- This ensures the agent_device_tokens table has all required columns
-- for the push notification system
-- ============================================================================

-- Create agent_device_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS agent_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version TEXT DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE agent_device_tokens 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS device_token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraints if they don't exist
DO $$ 
BEGIN
  -- Add primary key constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_device_tokens_pkey') THEN
    ALTER TABLE agent_device_tokens ADD PRIMARY KEY (id);
  END IF;
  
  -- Add unique constraint on device_token if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_device_tokens_device_token_key') THEN
    ALTER TABLE agent_device_tokens ADD CONSTRAINT agent_device_tokens_device_token_key UNIQUE (device_token);
  END IF;
  
  -- Add check constraint on platform if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agent_device_tokens_platform_check') THEN
    ALTER TABLE agent_device_tokens ADD CONSTRAINT agent_device_tokens_platform_check CHECK (platform IN ('ios', 'android'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_device_tokens_agent_id ON agent_device_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_device_tokens_active ON agent_device_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_device_tokens_token ON agent_device_tokens(device_token);

-- Enable RLS
ALTER TABLE agent_device_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can manage their own device tokens" ON agent_device_tokens;
DROP POLICY IF EXISTS "Service role can manage all device tokens" ON agent_device_tokens;

-- RLS Policies
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

-- Service role can manage all tokens
CREATE POLICY "Service role can manage all device tokens"
  ON agent_device_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_agent_device_tokens_updated_at ON agent_device_tokens;
CREATE TRIGGER trigger_update_agent_device_tokens_updated_at
  BEFORE UPDATE ON agent_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE agent_device_tokens IS 'Stores device tokens for push notifications';
COMMENT ON COLUMN agent_device_tokens.agent_id IS 'Reference to the agent who owns this device';
COMMENT ON COLUMN agent_device_tokens.device_token IS 'FCM/Expo push notification token';
COMMENT ON COLUMN agent_device_tokens.platform IS 'Device platform: ios or android';
COMMENT ON COLUMN agent_device_tokens.app_version IS 'App version when token was registered';
COMMENT ON COLUMN agent_device_tokens.is_active IS 'Whether this token is still valid';
COMMENT ON COLUMN agent_device_tokens.created_at IS 'When token was registered';
COMMENT ON COLUMN agent_device_tokens.updated_at IS 'Last update timestamp';
