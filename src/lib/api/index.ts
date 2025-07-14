// API Client
export { default as apiClient, setTokens, getTokens, clearTokens } from './client';

// Services
export { AuthService } from './services/auth';
export { ResumeService } from './services/resume';

// Types
export type {
  ApiResponse,
  ApiError,
  LoadingState,
  PaginationParams,
  PaginatedResponse,
  
  // Authentication types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  ResetPasswordRequest,
  ConfirmResetPasswordRequest,
  AuthTokens,
  User,
  
  // Resume types
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
  Project,
  Certification,
  Language,
  CustomSection,
  Resume,
  CreateResumeRequest,
  UpdateResumeRequest,
  Template,
} from './types';

// Hooks
export {
  // Auth hooks
  useRegister,
  useLogin,
  useLogout,
  useVerifyEmail,
  useRequestPasswordReset,
  useResetPassword,
  useProfile,
  useUpdateProfile,
  useChangePassword,
  useDeleteAccount,
  useIsAuthenticated,
  authKeys,
} from '../hooks/useAuth';

export {
  // Resume hooks
  useResumes,
  useResume,
  usePublicResume,
  useCreateResume,
  useUpdateResume,
  useDeleteResume,
  useDuplicateResume,
  useTogglePublic,
  useUpdateResumeSettings,
  useExportPDF,
  useImportResume,
  useResumeAnalytics,
  useSearchResumes,
  useTemplates,
  useTemplate,
  useSharingLink,
  resumeKeys,
  templateKeys,
} from '../hooks/useResume'; 