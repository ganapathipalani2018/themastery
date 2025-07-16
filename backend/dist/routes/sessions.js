"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionController_1 = require("../controllers/sessionController");
const auth_1 = require("../middleware/auth");
// Security middleware
const security_1 = require("../middleware/security");
// Validation middleware
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Apply session info middleware to all routes
router.use(sessionController_1.attachSessionInfo);
/**
 * @route   POST /api/sessions/refresh
 * @desc    Refresh access token with session tracking
 * @access  Public
 * @security Rate limited to 10 requests per 15 minutes
 * @validation Body validated against refreshTokenSchema
 */
router.post('/refresh', security_1.authRateLimit, (0, validation_1.validateBody)(validation_1.refreshTokenSchema), sessionController_1.refreshTokenWithSession);
/**
 * @route   GET /api/sessions
 * @desc    Get all active sessions for current user
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/', auth_1.authenticateToken, sessionController_1.getUserSessions);
/**
 * @route   GET /api/sessions/stats
 * @desc    Get session statistics for current user
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/stats', auth_1.authenticateToken, sessionController_1.getSessionStats);
/**
 * @route   POST /api/sessions/revoke
 * @desc    Revoke a specific session
 * @access  Private
 * @security Requires valid JWT token, Rate limited
 * @validation Body validated for sessionId
 */
router.post('/revoke', auth_1.authenticateToken, security_1.authRateLimit, (0, validation_1.validateBody)(validation_1.idParamSchema.extend({ sessionId: validation_1.idParamSchema.shape.id })), sessionController_1.revokeSession);
/**
 * @route   POST /api/sessions/revoke-all
 * @desc    Revoke all sessions except current one
 * @access  Private
 * @security Requires valid JWT token, Rate limited
 */
router.post('/revoke-all', auth_1.authenticateToken, security_1.authRateLimit, sessionController_1.revokeAllSessions);
/**
 * @route   GET /api/sessions/filtered
 * @desc    Get filtered sessions with pagination
 * @access  Private
 * @security Requires valid JWT token
 * @validation Query parameters validated for filtering
 */
router.get('/filtered', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_1.idParamSchema.extend({
    status: validation_1.idParamSchema.shape.id.optional(),
    device_type: validation_1.idParamSchema.shape.id.optional(),
    location: validation_1.idParamSchema.shape.id.optional(),
    limit: validation_1.idParamSchema.shape.id.optional(),
    offset: validation_1.idParamSchema.shape.id.optional()
})), sessionController_1.getFilteredSessions);
/**
 * @route   GET /api/sessions/suspicious
 * @desc    Check for suspicious sessions
 * @access  Private
 * @security Requires valid JWT token
 * @validation Query parameters validated for time window
 */
router.get('/suspicious', auth_1.authenticateToken, (0, validation_1.validateQuery)(validation_1.idParamSchema.extend({
    hours: validation_1.idParamSchema.shape.id.optional()
})), sessionController_1.checkSuspiciousSessions);
/**
 * @route   POST /api/sessions/cleanup
 * @desc    Clean up expired sessions (maintenance endpoint)
 * @access  Private
 * @security Requires valid JWT token (could be admin-only)
 * @note    This could be restricted to admin users only
 */
router.post('/cleanup', auth_1.authenticateToken, security_1.authRateLimit, sessionController_1.cleanupExpiredSessions);
exports.default = router;
