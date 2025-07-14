export interface User {
  id: string;
  email: string;
  password_hash?: string; // Optional since OAuth users don't need passwords
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  is_verified: boolean;
  verification_token?: string;
  reset_password_token?: string;
  reset_password_expires?: Date;
  google_id?: string; // Google OAuth unique identifier
  google_refresh_token?: string; // Google OAuth refresh token
  last_login?: Date;
  account_status: 'active' | 'suspended' | 'deactivated';
  subscription_status: 'free' | 'premium' | 'enterprise';
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  email: string;
  password?: string; // Optional for OAuth users
  first_name: string;
  last_name: string;
}

export interface GoogleOAuthRequest {
  email: string;
  first_name: string;
  last_name: string;
  google_id: string;
  profile_picture_url?: string;
  google_refresh_token?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url?: string;
  is_verified: boolean;
  google_id?: string;
  last_login?: Date;
  account_status: 'active' | 'suspended' | 'deactivated';
  subscription_status: 'free' | 'premium' | 'enterprise';
  created_at: Date;
  updated_at: Date;
} 