import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ResumeService } from '../api/services/resume';
import {
  Resume,
  CreateResumeRequest,
  UpdateResumeRequest,
  PaginationParams,
  Template,
  ApiResponse,
  PaginatedResponse,
} from '../api/types';

// Query Keys
export const resumeKeys = {
  all: ['resumes'] as const,
  lists: () => [...resumeKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...resumeKeys.lists(), params] as const,
  details: () => [...resumeKeys.all, 'detail'] as const,
  detail: (id: string) => [...resumeKeys.details(), id] as const,
  public: (slug: string) => [...resumeKeys.all, 'public', slug] as const,
  analytics: (id: string) => [...resumeKeys.all, 'analytics', id] as const,
  search: (query: string, params?: PaginationParams) => 
    [...resumeKeys.all, 'search', query, params] as const,
};

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

/**
 * Hook for getting all resumes
 */
export const useResumes = (params?: PaginationParams) => {
  return useQuery({
    queryKey: resumeKeys.list(params),
    queryFn: () => ResumeService.getResumes(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: ApiResponse<PaginatedResponse<Resume>>) => data.data,
  });
};

/**
 * Hook for getting a specific resume
 */
export const useResume = (id: string) => {
  return useQuery({
    queryKey: resumeKeys.detail(id),
    queryFn: () => ResumeService.getResume(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: ApiResponse<Resume>) => data.data,
  });
};

/**
 * Hook for getting a public resume
 */
export const usePublicResume = (slug: string) => {
  return useQuery({
    queryKey: resumeKeys.public(slug),
    queryFn: () => ResumeService.getPublicResume(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data: ApiResponse<Resume>) => data.data,
  });
};

/**
 * Hook for creating a new resume
 */
export const useCreateResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateResumeRequest) => ResumeService.createResume(data),
    onSuccess: () => {
      // Invalidate resumes list to refetch with new resume
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Resume creation failed:', error);
    },
  });
};

/**
 * Hook for updating a resume
 */
export const useUpdateResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResumeRequest }) => 
      ResumeService.updateResume(id, data),
    onSuccess: (response, { id }) => {
      if (response.success && response.data) {
        // Update specific resume cache
        queryClient.setQueryData(resumeKeys.detail(id), response);
        // Invalidate resumes list
        queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      }
    },
    onError: (error: any) => {
      console.error('Resume update failed:', error);
    },
  });
};

/**
 * Hook for deleting a resume
 */
export const useDeleteResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ResumeService.deleteResume(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: resumeKeys.detail(id) });
      // Invalidate resumes list
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Resume deletion failed:', error);
    },
  });
};

/**
 * Hook for duplicating a resume
 */
export const useDuplicateResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title?: string }) => 
      ResumeService.duplicateResume(id, title),
    onSuccess: () => {
      // Invalidate resumes list to show new duplicate
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Resume duplication failed:', error);
    },
  });
};

/**
 * Hook for toggling resume public visibility
 */
export const useTogglePublic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ResumeService.togglePublic(id),
    onSuccess: (response, id) => {
      if (response.success && response.data) {
        // Update specific resume cache
        queryClient.setQueryData(resumeKeys.detail(id), response);
        // Invalidate resumes list
        queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      }
    },
    onError: (error: any) => {
      console.error('Toggle public failed:', error);
    },
  });
};

/**
 * Hook for updating resume settings
 */
export const useUpdateResumeSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, settings }: { 
      id: string; 
      settings: { themeColor?: string; fontFamily?: string; templateId?: string }
    }) => ResumeService.updateSettings(id, settings),
    onSuccess: (response, { id }) => {
      if (response.success && response.data) {
        // Update specific resume cache
        queryClient.setQueryData(resumeKeys.detail(id), response);
        // Invalidate resumes list
        queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
      }
    },
    onError: (error: any) => {
      console.error('Resume settings update failed:', error);
    },
  });
};

/**
 * Hook for exporting resume as PDF
 */
export const useExportPDF = () => {
  return useMutation({
    mutationFn: (id: string) => ResumeService.exportPDF(id),
    onError: (error: any) => {
      console.error('PDF export failed:', error);
    },
  });
};

/**
 * Hook for importing resume from JSON
 */
export const useImportResume = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => ResumeService.importFromJSON(data),
    onSuccess: () => {
      // Invalidate resumes list to show imported resume
      queryClient.invalidateQueries({ queryKey: resumeKeys.lists() });
    },
    onError: (error: any) => {
      console.error('Resume import failed:', error);
    },
  });
};

/**
 * Hook for getting resume analytics
 */
export const useResumeAnalytics = (id: string) => {
  return useQuery({
    queryKey: resumeKeys.analytics(id),
    queryFn: () => ResumeService.getAnalytics(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
  });
};

/**
 * Hook for searching resumes
 */
export const useSearchResumes = (query: string, params?: PaginationParams) => {
  return useQuery({
    queryKey: resumeKeys.search(query, params),
    queryFn: () => ResumeService.searchResumes(query, params),
    enabled: !!query && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: ApiResponse<PaginatedResponse<Resume>>) => data.data,
  });
};

/**
 * Hook for getting all templates
 */
export const useTemplates = () => {
  return useQuery({
    queryKey: templateKeys.lists(),
    queryFn: () => ResumeService.getTemplates(),
    staleTime: 30 * 60 * 1000, // 30 minutes (templates don't change often)
    select: (data: ApiResponse<Template[]>) => data.data,
  });
};

/**
 * Hook for getting a specific template
 */
export const useTemplate = (id: string) => {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => ResumeService.getTemplate(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    select: (data: ApiResponse<Template>) => data.data,
  });
};

/**
 * Hook for getting resume sharing link
 */
export const useSharingLink = (id: string) => {
  return useQuery({
    queryKey: [...resumeKeys.detail(id), 'sharing'],
    queryFn: () => ResumeService.getSharingLink(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    select: (data) => data.data,
  });
}; 