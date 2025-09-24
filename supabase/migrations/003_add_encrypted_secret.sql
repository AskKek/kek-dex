-- Add encrypted_secret column for proper secret storage
-- This migration adds support for encrypted API secrets instead of bcrypt hashes

-- Add the new column for encrypted secrets
ALTER TABLE webhooks
ADD COLUMN encrypted_secret TEXT;

-- Add index on api_key_hash for faster lookups
ALTER TABLE webhooks
ADD COLUMN api_key_hash VARCHAR(64);

CREATE INDEX idx_webhooks_api_key_hash ON webhooks(api_key_hash);

-- Comment on the new columns
COMMENT ON COLUMN webhooks.encrypted_secret IS 'AES-256-GCM encrypted API secret (format: iv:ciphertext:authtag)';
COMMENT ON COLUMN webhooks.api_key_hash IS 'SHA-256 hash of API key for secure indexing';
COMMENT ON COLUMN webhooks.api_secret_hash IS 'DEPRECATED: Bcrypt hash - cannot be used for HMAC verification';

-- Update existing webhooks to mark them as needing migration
UPDATE webhooks
SET updated_at = NOW()
WHERE encrypted_secret IS NULL;