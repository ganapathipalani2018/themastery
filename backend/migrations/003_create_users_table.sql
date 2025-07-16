-- Migration: Create comprehensive users table for authentication and account management

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- nullable for OAuth users
    name VARCHAR(100),
    profile_picture_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_expiry TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expiry TIMESTAMP,
    subscription_status VARCHAR(50) DEFAULT 'free',
    account_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active/suspended/deleted
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- user/admin
    security_questions JSONB,
    two_fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_secret VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    user_preferences JSONB,
    google_id VARCHAR(255),
    UNIQUE (google_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login); 