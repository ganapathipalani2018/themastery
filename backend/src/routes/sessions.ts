import { Router } from 'express';
import {
  refreshTokenWithSession,
  getUserSessions,
  getSessionStats,
  revokeSession,
  revokeAllSessions,
  getFilteredSessions,
  checkSuspiciousSessions,
  cleanupExpiredSessions,
  attachSessionInfo
} from '../controllers/sessionController';
import { authenticateToken } from '../middleware/auth';

// Security middleware
import { authRateLimit } from '../middleware/security';

// Validation middleware
import {
  validateBody,
  validateParams,
  validateQuery,
  refreshTokenSchema,
  idParamSchema
} from '../utils/validation';

const router = Router();

// Apply session info middleware to all routes
router.use(attachSessionInfo);

/**
 * @route   POST /api/sessions/refresh
 * @desc    Refresh access token with session tracking
 * @access  Public
 * @security Rate limited to 10 requests per 15 minutes
 * @validation Body validated against refreshTokenSchema
 */
router.post('/refresh', 
  authRateLimit,
  validateBody(refreshTokenSchema),
  refreshTokenWithSession
);

/**
 * @route   GET /api/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/', 
  authenticateToken,
  getUserSessions
);

/**
 * @route   GET /api/sessions/stats
 * @desc    Get session statistics for current user
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/stats', 
  authenticateToken,
  getSessionStats
);

/**
 * @route   POST /api/sessions/revoke
 * @desc    Revoke a specific session
 * @access  Private
 * @security Requires valid JWT token, Rate limited
 * @validation Body validated for sessionId
 */
router.post('/revoke', 
  authenticateToken,
  authRateLimit,
  validateBody(idParamSchema.extend({ sessionId: idParamSchema.shape.id })),
  revokeSession
);

/**
 * @route   POST /api/sessions/revoke-all
 * @desc    Revoke all sessions except current one
 * @access  Private
 * @security Requires valid JWT token, Rate limited
 */
router.post('/revoke-all', 
  authenticateToken,
  authRateLimit,
  revokeAllSessions
);

/**
 * @route   GET /api/sessions/filtered
 * @desc    Get filtered sessions with pagination
 * @access  Private
 * @security Requires valid JWT token
 * @validation Query parameters validated for filtering
 */
router.get('/filtered', 
  authenticateToken,
  validateQuery(idParamSchema.extend({
    status: idParamSchema.shape.id.optional(),
    device_type: idParamSchema.shape.id.optional(),
    location: idParamSchema.shape.id.optional(),
    limit: idParamSchema.shape.id.optional(),
    offset: idParamSchema.shape.id.optional()
  })),
  getFilteredSessions
);

/**
 * @route   GET /api/sessions/suspicious
 * @desc    Check for suspicious sessions
 * @access  Private
 * @security Requires valid JWT token
 * @validation Query parameters validated for time window
 */
router.get('/suspicious', 
  authenticateToken,
  validateQuery(idParamSchema.extend({
    hours: idParamSchema.shape.id.optional()
  })),
  checkSuspiciousSessions
);

/**
 * @route   POST /api/sessions/cleanup
 * @desc    Clean up expired sessions (maintenance endpoint)
 * @access  Private
 * @security Requires valid JWT token (could be admin-only)
 * @note    This could be restricted to admin users only
 */
router.post('/cleanup', 
  authenticateToken,
  authRateLimit,
  cleanupExpiredSessions
);

export default router; 