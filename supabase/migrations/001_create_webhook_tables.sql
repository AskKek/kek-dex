-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  api_secret_hash VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  allowed_symbols TEXT[] DEFAULT '{}',
  max_order_size DECIMAL(20, 8) DEFAULT 1000,
  daily_limit DECIMAL(20, 8) DEFAULT 10000,
  require_stop_loss BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  request_payload JSONB,
  response_payload JSONB,
  order_id VARCHAR(255),
  status VARCHAR(50) CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_limits table for persistent rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  window_type VARCHAR(50) CHECK (window_type IN ('minute', 'hour', 'day')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 0,
  UNIQUE(user_id, api_key, window_type, window_start)
);

-- Create indexes for better performance
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_api_key ON webhooks(api_key);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_rate_limits_user_api_window ON rate_limits(user_id, api_key, window_type);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for webhooks table
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies for webhooks table
CREATE POLICY "Users can view their own webhooks"
  ON webhooks FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can create their own webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can update their own webhooks"
  ON webhooks FOR UPDATE
  USING (user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub');

CREATE POLICY "Users can delete their own webhooks"
  ON webhooks FOR DELETE
  USING (user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub');

-- Policies for webhook_logs table
CREATE POLICY "Users can view their webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhooks WHERE user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub'
    )
  );

-- Policies for rate_limits table
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = auth.jwt()->>'sub');

-- Grant permissions for authenticated users
GRANT ALL ON webhooks TO authenticated;
GRANT ALL ON webhook_logs TO authenticated;
GRANT ALL ON rate_limits TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;