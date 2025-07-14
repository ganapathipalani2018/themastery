// Base API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

// Resume Types
export interface PersonalInfo {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
}

export interface WorkExperience {
  id?: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  location?: string;
}

export interface Education {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  gpa?: string;
  description?: string;
}

export interface Skill {
  id?: string;
  name: string;
  category?: string;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  technologies?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  githubUrl?: string;
}

export interface Certification {
  id?: string;
  name: string;
  issuer: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
}

export interface Language {
  id?: string;
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface CustomSection {
  id?: string;
  title: string;
  content: string;
  orderIndex: number;
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  themeColor?: string;
  fontFamily?: string;
  isPublic: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
  personalInfo?: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  customSections: CustomSection[];
}

export interface CreateResumeRequest {
  title: string;
  templateId: string;
  themeColor?: string;
  fontFamily?: string;
}

export interface UpdateResumeRequest extends Partial<CreateResumeRequest> {
  personalInfo?: PersonalInfo;
  workExperience?: WorkExperience[];
  education?: Education[];
  skills?: Skill[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: Language[];
  customSections?: CustomSection[];
}

// Template Types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Error Types
export interface ApiError {
  success: false;
  message: string;
  error: string;
  details?: any;
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} 