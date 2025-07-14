-- Migration: Add Google OAuth fields to users table
-- Created: 2024-07-14

-- Add Google OAuth fields to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'free';

-- Create index for google_id for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);

-- Make password_hash nullable since OAuth users don't need passwords
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.google_id IS 'Google OAuth unique identifier';
COMMENT ON COLUMN users.google_refresh_token IS 'Google OAuth refresh token for API access';
COMMENT ON COLUMN users.last_login IS 'Timestamp of last successful login';
COMMENT ON COLUMN users.account_status IS 'Account status: active, suspended, deactivated';
COMMENT ON COLUMN users.subscription_status IS 'Subscription tier: free, premium, enterprise'; 