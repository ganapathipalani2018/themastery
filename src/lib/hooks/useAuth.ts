import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../api/services/auth';
import {
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  User,
  ApiResponse,
} from '../api/types';
import { clearTokens } from '../api/client';

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

/**
 * Hook for user registration
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: (data: RegisterRequest) => AuthService.register(data),
    onError: (error: any) => {
      console.error('Registration failed:', error);
    },
  });
};

/**
 * Hook for user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LoginRequest) => AuthService.login(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Invalidate and refetch user profile
        queryClient.invalidateQueries({ queryKey: authKeys.profile() });
        queryClient.setQueryData(authKeys.profile(), response.data.user);
      }
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
    },
  });
};

/**
 * Hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      clearTokens();
    },
    onError: (error: any) => {
      console.error('Logout failed:', error);
      // Still clear tokens and cache even if logout request fails
      queryClient.clear();
      clearTokens();
    },
  });
};

/**
 * Hook for email verification
 */
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (token: string) => AuthService.verifyEmail(token),
    onError: (error: any) => {
      console.error('Email verification failed:', error);
    },
  });
};

/**
 * Hook for password reset request
 */
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => AuthService.requestPasswordReset(data),
    onError: (error: any) => {
      console.error('Password reset request failed:', error);
    },
  });
};

/**
 * Hook for password reset confirmation
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: (data: ConfirmResetPasswordRequest) => AuthService.resetPassword(data),
    onError: (error: any) => {
      console.error('Password reset failed:', error);
    },
  });
};

/**
 * Hook for getting user profile
 */
export const useProfile = () => {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => AuthService.getProfile(),
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: ApiResponse<User>) => data.data,
  });
};

/**
 * Hook for updating user profile
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<User>) => AuthService.updateProfile(data),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Update cached profile data
        queryClient.setQueryData(authKeys.profile(), response);
      }
    },
    onError: (error: any) => {
      console.error('Profile update failed:', error);
    },
  });
};

/**
 * Hook for changing password
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => 
      AuthService.changePassword(data),
    onError: (error: any) => {
      console.error('Password change failed:', error);
    },
  });
};

/**
 * Hook for deleting account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { password: string }) => AuthService.deleteAccount(data),
    onSuccess: () => {
      // Clear all cached data and tokens
      queryClient.clear();
      clearTokens();
    },
    onError: (error: any) => {
      console.error('Account deletion failed:', error);
    },
  });
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = () => {
  const { data: profile, isLoading, error } = useProfile();
  
  return {
    isAuthenticated: !!profile && !error,
    isLoading,
    user: profile,
  };
}; 