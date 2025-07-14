"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
// Security middleware
const security_1 = require("../middleware/security");
// Validation middleware
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against registerSchema
 */
router.post('/register', security_1.authRateLimit, (0, validation_1.validateBody)(validation_1.registerSchema), authController_1.register);
/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against loginSchema
 */
router.post('/login', security_1.authRateLimit, (0, validation_1.validateBody)(validation_1.loginSchema), authController_1.login);
/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Body validated against refreshTokenSchema
 */
router.post('/refresh', security_1.authRateLimit, (0, validation_1.validateBody)(validation_1.refreshTokenSchema), authController_1.refreshToken);
/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user email
 * @access  Public
 * @security Rate limited to 5 requests per 15 minutes
 * @validation Token parameter validated
 */
router.get('/verify/:token', security_1.authRateLimit, (0, validation_1.validateParams)(validation_1.idParamSchema.extend({ token: validation_1.idParamSchema.shape.id })), authController_1.verifyEmail);
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 * @security Rate limited to 3 requests per hour
 * @validation Body validated against forgotPasswordSchema
 */
router.post('/forgot-password', security_1.passwordResetRateLimit, (0, validation_1.validateBody)(validation_1.forgotPasswordSchema), authController_1.requestPasswordReset);
/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @security Rate limited to 3 requests per hour
 * @validation Body validated against resetPasswordSchema
 */
router.post('/reset-password', security_1.passwordResetRateLimit, (0, validation_1.validateBody)(validation_1.resetPasswordSchema), authController_1.resetPassword);
/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 * @security Requires valid JWT token
 */
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
exports.default = router;
