import apiClient from '../client';
import {
  ApiResponse,
  Resume,
  CreateResumeRequest,
  UpdateResumeRequest,
  PaginatedResponse,
  PaginationParams,
  Template,
} from '../types';

export class ResumeService {
  /**
   * Get all resumes for the current user
   */
  static async getResumes(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Resume>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Resume>>>('/api/resumes', { params });
    return response.data;
  }

  /**
   * Get a specific resume by ID
   */
  static async getResume(id: string): Promise<ApiResponse<Resume>> {
    const response = await apiClient.get<ApiResponse<Resume>>(`/api/resumes/${id}`);
    return response.data;
  }

  /**
   * Get a public resume by slug
   */
  static async getPublicResume(slug: string): Promise<ApiResponse<Resume>> {
    const response = await apiClient.get<ApiResponse<Resume>>(`/api/resumes/public/${slug}`);
    return response.data;
  }

  /**
   * Create a new resume
   */
  static async createResume(data: CreateResumeRequest): Promise<ApiResponse<Resume>> {
    const response = await apiClient.post<ApiResponse<Resume>>('/api/resumes', data);
    return response.data;
  }

  /**
   * Update an existing resume
   */
  static async updateResume(id: string, data: UpdateResumeRequest): Promise<ApiResponse<Resume>> {
    const response = await apiClient.put<ApiResponse<Resume>>(`/api/resumes/${id}`, data);
    return response.data;
  }

  /**
   * Delete a resume
   */
  static async deleteResume(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/resumes/${id}`);
    return response.data;
  }

  /**
   * Duplicate a resume
   */
  static async duplicateResume(id: string, title?: string): Promise<ApiResponse<Resume>> {
    const response = await apiClient.post<ApiResponse<Resume>>(`/api/resumes/${id}/duplicate`, { title });
    return response.data;
  }

  /**
   * Toggle resume public visibility
   */
  static async togglePublic(id: string): Promise<ApiResponse<Resume>> {
    const response = await apiClient.patch<ApiResponse<Resume>>(`/api/resumes/${id}/toggle-public`);
    return response.data;
  }

  /**
   * Update resume settings (theme, font, etc.)
   */
  static async updateSettings(id: string, settings: {
    themeColor?: string;
    fontFamily?: string;
    templateId?: string;
  }): Promise<ApiResponse<Resume>> {
    const response = await apiClient.patch<ApiResponse<Resume>>(`/api/resumes/${id}/settings`, settings);
    return response.data;
  }

  /**
   * Export resume as PDF
   */
  static async exportPDF(id: string): Promise<Blob> {
    const response = await apiClient.get(`/api/resumes/${id}/export/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Export resume as JSON
   */
  static async exportJSON(id: string): Promise<ApiResponse<Resume>> {
    const response = await apiClient.get<ApiResponse<Resume>>(`/api/resumes/${id}/export/json`);
    return response.data;
  }

  /**
   * Import resume from JSON
   */
  static async importFromJSON(data: any): Promise<ApiResponse<Resume>> {
    const response = await apiClient.post<ApiResponse<Resume>>('/api/resumes/import/json', data);
    return response.data;
  }

  /**
   * Get resume analytics (views, downloads, etc.)
   */
  static async getAnalytics(id: string): Promise<ApiResponse<{
    views: number;
    downloads: number;
    lastViewed: string;
    viewHistory: Array<{ date: string; views: number }>;
  }>> {
    const response = await apiClient.get(`/api/resumes/${id}/analytics`);
    return response.data;
  }

  /**
   * Get all available templates
   */
  static async getTemplates(): Promise<ApiResponse<Template[]>> {
    const response = await apiClient.get<ApiResponse<Template[]>>('/api/templates');
    return response.data;
  }

  /**
   * Get a specific template
   */
  static async getTemplate(id: string): Promise<ApiResponse<Template>> {
    const response = await apiClient.get<ApiResponse<Template>>(`/api/templates/${id}`);
    return response.data;
  }

  /**
   * Search resumes
   */
  static async searchResumes(query: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Resume>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Resume>>>('/api/resumes/search', {
      params: { q: query, ...params },
    });
    return response.data;
  }

  /**
   * Get resume sharing link
   */
  static async getSharingLink(id: string): Promise<ApiResponse<{ url: string; slug: string }>> {
    const response = await apiClient.get<ApiResponse<{ url: string; slug: string }>>(`/api/resumes/${id}/share`);
    return response.data;
  }

  /**
   * Update resume sharing settings
   */
  static async updateSharingSettings(id: string, settings: {
    isPublic: boolean;
    allowDownload?: boolean;
    expiresAt?: string;
  }): Promise<ApiResponse<Resume>> {
    const response = await apiClient.patch<ApiResponse<Resume>>(`/api/resumes/${id}/sharing`, settings);
    return response.data;
  }
} 