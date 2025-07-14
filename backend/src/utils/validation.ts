import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Common validation schemas
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');

export const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')
  .optional();

export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL must be less than 2048 characters')
  .optional();

// Authentication validation schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Resume validation schemas
export const personalInfoSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().max(500, 'Address must be less than 500 characters').optional(),
  city: z.string().max(100, 'City must be less than 100 characters').optional(),
  state: z.string().max(100, 'State must be less than 100 characters').optional(),
  zipCode: z.string().max(20, 'Zip code must be less than 20 characters').optional(),
  country: z.string().max(100, 'Country must be less than 100 characters').optional(),
  website: urlSchema,
  linkedin: urlSchema,
  github: urlSchema,
  summary: z.string().max(1000, 'Summary must be less than 1000 characters').optional()
});

export const workExperienceSchema = z.object({
  company: z.string().min(1, 'Company is required').max(200, 'Company must be less than 200 characters'),
  position: z.string().min(1, 'Position is required').max(200, 'Position must be less than 200 characters'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  current: z.boolean().default(false),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional()
}).refine((data) => {
  if (data.current) {return true;}
  return data.endDate !== undefined;
}, {
  message: 'End date is required when current is false',
  path: ['endDate'],
});

export const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200, 'Institution must be less than 200 characters'),
  degree: z.string().min(1, 'Degree is required').max(200, 'Degree must be less than 200 characters'),
  fieldOfStudy: z.string().max(200, 'Field of study must be less than 200 characters').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  current: z.boolean().default(false),
  gpa: z.number().min(0).max(4.0).optional(),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional()
});

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(100, 'Skill name must be less than 100 characters'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional()
});

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  technologies: z.array(z.string().max(50)).max(20, 'Too many technologies listed').optional(),
  url: urlSchema,
  githubUrl: urlSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional()
});

export const certificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required').max(200, 'Certification name must be less than 200 characters'),
  issuer: z.string().min(1, 'Issuer is required').max(200, 'Issuer must be less than 200 characters'),
  dateIssued: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  credentialId: z.string().max(100, 'Credential ID must be less than 100 characters').optional(),
  url: urlSchema
});

export const languageSchema = z.object({
  name: z.string().min(1, 'Language name is required').max(100, 'Language name must be less than 100 characters'),
  proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']).optional()
});

export const resumeCreateSchema = z.object({
  title: z.string().min(1, 'Resume title is required').max(200, 'Title must be less than 200 characters'),
  template: z.string().min(1, 'Template is required').max(50, 'Template must be less than 50 characters'),
  theme: z.string().max(50, 'Theme must be less than 50 characters').optional(),
  isPublic: z.boolean().default(false)
});

export const resumeUpdateSchema = z.object({
  title: z.string().min(1, 'Resume title is required').max(200, 'Title must be less than 200 characters').optional(),
  template: z.string().min(1, 'Template is required').max(50, 'Template must be less than 50 characters').optional(),
  theme: z.string().max(50, 'Theme must be less than 50 characters').optional(),
  isPublic: z.boolean().optional()
});

// Pagination and query schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).refine(n => n > 0, 'Page must be greater than 0').optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  sortBy: z.string().max(50, 'Sort field must be less than 50 characters').optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(200, 'Search query must be less than 200 characters').optional()
});

export const idParamSchema = z.object({
  id: uuidSchema
});

// Validation middleware factory
export const validateRequest = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors
        });
      }

      // Attach validated data to request
      (req as any).validatedData = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error during validation'
      });
    }
  };
};

// Validate specific parts of request
export const validateBody = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: errors
        });
      }

      req.body = result.data;
      next();
    } catch (error) {
      console.error('Body validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error during validation'
      });
    }
  };
};

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors
        });
      }

      req.query = result.data as any;
      next();
    } catch (error) {
      console.error('Query validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error during validation'
      });
    }
  };
};

export const validateParams = <T extends z.ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid URL parameters',
          details: errors
        });
      }

      req.params = result.data as any;
      next();
    } catch (error) {
      console.error('Params validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error during validation'
      });
    }
  };
};

// Extend Express Request interface to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
} 