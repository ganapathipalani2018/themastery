import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

// Security middleware
import { authRateLimit, passwordResetRateLimit } from '../middleware/security';

// Validation middleware
import {
  validateBody,
  validateParams,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  idParamSchema
} from '../utils/validation';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against registerSchema
 */
router.post('/register', 
  authRateLimit,
  validateBody(registerSchema),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against loginSchema
 */
router.post('/login', 
  authRateLimit,
  validateBody(loginSchema),
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against refreshTokenSchema
 */
router.post('/refresh', 
  authRateLimit,
  validateBody(refreshTokenSchema),
  refreshToken
);

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user email
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Token parameter validated
 */
router.get('/verify/:token', 
  authRateLimit,
  validateParams(idParamSchema.extend({ token: idParamSchema.shape.id })),
  verifyEmail
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @security Rate limited to 3 requests per hour
 * @validation Body validated against forgotPasswordSchema
 */
router.post('/forgot-password', 
  passwordResetRateLimit,
  validateBody(forgotPasswordSchema),
  requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @security Rate limited to 3 requests per hour
 * @validation Body validated against resetPasswordSchema
 */
router.post('/reset-password', 
  passwordResetRateLimit,
  validateBody(resetPasswordSchema),
  resetPassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/profile', 
  authenticateToken, 
  getProfile
);

export default router; 