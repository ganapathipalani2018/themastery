-- Migration: Create sessions table for comprehensive session management
-- Created: 2024-07-14

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_id VARCHAR(255) UNIQUE,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    browser_version VARCHAR(50),
    operating_system VARCHAR(100),
    os_version VARCHAR(50),
    ip_address INET,
    location VARCHAR(255),
    country_code VARCHAR(2),
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_by VARCHAR(50) -- 'user', 'admin', 'system'
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_refresh_token_id ON sessions(refresh_token_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_active ON sessions(user_id, is_revoked, expires_at);

-- Create partial index for active sessions only
CREATE INDEX idx_sessions_active_only ON sessions(user_id, last_active) 
WHERE is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP;

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'User session tracking with device information and security features';
COMMENT ON COLUMN sessions.session_token IS 'Unique session identifier';
COMMENT ON COLUMN sessions.refresh_token_id IS 'Reference to refresh token for this session';
COMMENT ON COLUMN sessions.device_type IS 'Device type: mobile, tablet, desktop';
COMMENT ON COLUMN sessions.browser IS 'Browser name from user agent';
COMMENT ON COLUMN sessions.browser_version IS 'Browser version from user agent';
COMMENT ON COLUMN sessions.operating_system IS 'Operating system from user agent';
COMMENT ON COLUMN sessions.os_version IS 'OS version from user agent';
COMMENT ON COLUMN sessions.ip_address IS 'IP address of the session';
COMMENT ON COLUMN sessions.location IS 'Geographic location based on IP';
COMMENT ON COLUMN sessions.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN sessions.last_active IS 'Timestamp of last session activity';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN sessions.is_revoked IS 'Whether session has been revoked';
COMMENT ON COLUMN sessions.revoked_at IS 'When the session was revoked';
COMMENT ON COLUMN sessions.revoked_by IS 'Who/what revoked the session';

-- Create function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_revoked = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_active timestamp
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sessions table
CREATE TRIGGER trigger_update_session_last_active
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_last_active(); 