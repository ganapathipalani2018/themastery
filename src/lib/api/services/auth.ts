import apiClient, { setTokens, clearTokens } from '../client';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  AuthTokens,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  User,
} from '../types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
    const response = await apiClient.post<ApiResponse<RegisterResponse>>('/api/auth/register', data);
    return response.data;
  }

  /**
   * Login user and store tokens
   */
  static async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/auth/login', data);
    
    if (response.data.success && response.data.data) {
      const { tokens } = response.data.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
    }
    
    return response.data;
  }

  /**
   * Logout user and clear tokens
   */
  static async logout(): Promise<void> {
    clearTokens();
    
    // Optional: Call backend logout endpoint if it exists
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Ignore errors during logout
      console.warn('Logout endpoint error:', error);
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<AuthTokens>> {
    const response = await apiClient.post<ApiResponse<AuthTokens>>('/api/auth/refresh', data);
    
    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken } = response.data.data;
      setTokens(accessToken, refreshToken);
    }
    
    return response.data;
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>(`/api/auth/verify/${token}`);
    return response.data;
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(data: ResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/api/auth/forgot-password', data);
    return response.data;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(data: ConfirmResetPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/api/auth/reset-password', data);
    return response.data;
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>('/api/auth/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    const response = await apiClient.put<ApiResponse<User>>('/api/auth/profile', data);
    return response.data;
  }

  /**
   * Change password
   */
  static async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>('/api/auth/change-password', data);
    return response.data;
  }

  /**
   * Delete user account
   */
  static async deleteAccount(data: { password: string }): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>('/api/auth/account', { data });
    return response.data;
  }
} 