export interface Session {
  id: string;
  user_id: number;
  session_token: string;
  refresh_token_id?: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  operating_system?: string;
  os_version?: string;
  ip_address?: string;
  location?: string;
  country_code?: string;
  last_active: Date;
  created_at: Date;
  expires_at: Date;
  is_revoked: boolean;
  revoked_at?: Date;
  revoked_by?: string;
}

export interface DeviceInfo {
  device_type?: string;
  browser?: string;
  browser_version?: string;
  operating_system?: string;
  os_version?: string;
  ip_address?: string;
  location?: string;
  country_code?: string;
}

export interface CreateSessionRequest {
  user_id: number;
  session_token: string;
  refresh_token_id?: string;
  device_info?: DeviceInfo;
  expires_at: Date;
}

export interface UpdateSessionRequest {
  last_active?: Date;
  device_info?: Partial<DeviceInfo>;
}

export interface SessionResponse {
  id: string;
  device_type?: string;
  browser?: string;
  browser_version?: string;
  operating_system?: string;
  os_version?: string;
  location?: string;
  country_code?: string;
  last_active: Date;
  created_at: Date;
  expires_at: Date;
  is_current: boolean;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
  current_session_id?: string;
}

export interface RevokeSessionRequest {
  session_id: string;
  revoked_by: 'user' | 'admin' | 'system';
}

export interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  revoked_sessions: number;
  expired_sessions: number;
  unique_devices: number;
  unique_locations: number;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface SessionFilter {
  user_id?: number;
  status?: SessionStatus;
  device_type?: string;
  location?: string;
  created_after?: Date;
  created_before?: Date;
  limit?: number;
  offset?: number;
} 