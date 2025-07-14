"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = exports.validateRequest = exports.idParamSchema = exports.paginationSchema = exports.resumeUpdateSchema = exports.resumeCreateSchema = exports.languageSchema = exports.certificationSchema = exports.projectSchema = exports.skillSchema = exports.educationSchema = exports.workExperienceSchema = exports.personalInfoSchema = exports.refreshTokenSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = exports.urlSchema = exports.phoneSchema = exports.nameSchema = exports.uuidSchema = exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
// Common validation schemas
exports.emailSchema = zod_1.z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters');
exports.passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
exports.uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
exports.nameSchema = zod_1.z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters');
exports.phoneSchema = zod_1.z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional();
exports.urlSchema = zod_1.z.string()
    .url('Invalid URL format')
    .max(2048, 'URL must be less than 2048 characters')
    .optional();
// Authentication validation schemas
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    firstName: exports.nameSchema,
    lastName: exports.nameSchema,
    confirmPassword: zod_1.z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: exports.emailSchema
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    password: exports.passwordSchema,
    confirmPassword: zod_1.z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required')
});
// Resume validation schemas
exports.personalInfoSchema = zod_1.z.object({
    firstName: exports.nameSchema,
    lastName: exports.nameSchema,
    email: exports.emailSchema,
    phone: exports.phoneSchema,
    address: zod_1.z.string().max(500, 'Address must be less than 500 characters').optional(),
    city: zod_1.z.string().max(100, 'City must be less than 100 characters').optional(),
    state: zod_1.z.string().max(100, 'State must be less than 100 characters').optional(),
    zipCode: zod_1.z.string().max(20, 'Zip code must be less than 20 characters').optional(),
    country: zod_1.z.string().max(100, 'Country must be less than 100 characters').optional(),
    website: exports.urlSchema,
    linkedin: exports.urlSchema,
    github: exports.urlSchema,
    summary: zod_1.z.string().max(1000, 'Summary must be less than 1000 characters').optional()
});
exports.workExperienceSchema = zod_1.z.object({
    company: zod_1.z.string().min(1, 'Company is required').max(200, 'Company must be less than 200 characters'),
    position: zod_1.z.string().min(1, 'Position is required').max(200, 'Position must be less than 200 characters'),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    current: zod_1.z.boolean().default(false),
    description: zod_1.z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    location: zod_1.z.string().max(200, 'Location must be less than 200 characters').optional()
}).refine((data) => {
    if (data.current) {
        return true;
    }
    return data.endDate !== undefined;
}, {
    message: 'End date is required when current is false',
    path: ['endDate'],
});
exports.educationSchema = zod_1.z.object({
    institution: zod_1.z.string().min(1, 'Institution is required').max(200, 'Institution must be less than 200 characters'),
    degree: zod_1.z.string().min(1, 'Degree is required').max(200, 'Degree must be less than 200 characters'),
    fieldOfStudy: zod_1.z.string().max(200, 'Field of study must be less than 200 characters').optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    current: zod_1.z.boolean().default(false),
    gpa: zod_1.z.number().min(0).max(4.0).optional(),
    description: zod_1.z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    location: zod_1.z.string().max(200, 'Location must be less than 200 characters').optional()
});
exports.skillSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Skill name is required').max(100, 'Skill name must be less than 100 characters'),
    level: zod_1.z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    category: zod_1.z.string().max(100, 'Category must be less than 100 characters').optional()
});
exports.projectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required').max(200, 'Project name must be less than 200 characters'),
    description: zod_1.z.string().max(2000, 'Description must be less than 2000 characters').optional(),
    technologies: zod_1.z.array(zod_1.z.string().max(50)).max(20, 'Too many technologies listed').optional(),
    url: exports.urlSchema,
    githubUrl: exports.urlSchema,
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional()
});
exports.certificationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Certification name is required').max(200, 'Certification name must be less than 200 characters'),
    issuer: zod_1.z.string().min(1, 'Issuer is required').max(200, 'Issuer must be less than 200 characters'),
    dateIssued: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    expirationDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
    credentialId: zod_1.z.string().max(100, 'Credential ID must be less than 100 characters').optional(),
    url: exports.urlSchema
});
exports.languageSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Language name is required').max(100, 'Language name must be less than 100 characters'),
    proficiency: zod_1.z.enum(['basic', 'conversational', 'fluent', 'native']).optional()
});
exports.resumeCreateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Resume title is required').max(200, 'Title must be less than 200 characters'),
    template: zod_1.z.string().min(1, 'Template is required').max(50, 'Template must be less than 50 characters'),
    theme: zod_1.z.string().max(50, 'Theme must be less than 50 characters').optional(),
    isPublic: zod_1.z.boolean().default(false)
});
exports.resumeUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Resume title is required').max(200, 'Title must be less than 200 characters').optional(),
    template: zod_1.z.string().min(1, 'Template is required').max(50, 'Template must be less than 50 characters').optional(),
    theme: zod_1.z.string().max(50, 'Theme must be less than 50 characters').optional(),
    isPublic: zod_1.z.boolean().optional()
});
// Pagination and query schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).refine(n => n > 0, 'Page must be greater than 0').optional(),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
    sortBy: zod_1.z.string().max(50, 'Sort field must be less than 50 characters').optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    search: zod_1.z.string().max(200, 'Search query must be less than 200 characters').optional()
});
exports.idParamSchema = zod_1.z.object({
    id: exports.uuidSchema
});
// Validation middleware factory
const validateRequest = (schema) => {
    return (req, res, next) => {
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
            req.validatedData = result.data;
            next();
        }
        catch (error) {
            console.error('Validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: 'Internal server error during validation'
            });
        }
    };
};
exports.validateRequest = validateRequest;
// Validate specific parts of request
const validateBody = (schema) => {
    return (req, res, next) => {
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
        }
        catch (error) {
            console.error('Body validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: 'Internal server error during validation'
            });
        }
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (req, res, next) => {
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
            req.query = result.data;
            next();
        }
        catch (error) {
            console.error('Query validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: 'Internal server error during validation'
            });
        }
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
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
            req.params = result.data;
            next();
        }
        catch (error) {
            console.error('Params validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'SERVER_ERROR',
                message: 'Internal server error during validation'
            });
        }
    };
};
exports.validateParams = validateParams;
