"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSessionInfo = exports.cleanupExpiredSessions = exports.checkSuspiciousSessions = exports.getFilteredSessions = exports.revokeAllSessions = exports.revokeSession = exports.getSessionStats = exports.getUserSessions = exports.refreshTokenWithSession = void 0;
const SessionRepository_1 = require("../repositories/SessionRepository");
const UserRepository_1 = require("../repositories/UserRepository");
const jwt_1 = require("../utils/jwt");
const deviceDetection_1 = require("../utils/deviceDetection");
const logger_1 = __importDefault(require("../config/logger"));
const sessionRepository = new SessionRepository_1.SessionRepository();
const userRepository = new UserRepository_1.UserRepository();
/**
 * Enhanced refresh token endpoint with session tracking
 */
const refreshTokenWithSession = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: 'Refresh token is required',
                error: 'MISSING_REFRESH_TOKEN'
            });
            return;
        }
        // Verify refresh token
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        // Find user
        const user = await userRepository.findById(decoded.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
                error: 'INVALID_REFRESH_TOKEN'
            });
            return;
        }
        // Extract device information
        const deviceInfo = (0, deviceDetection_1.extractDeviceInfo)(req);
        // Find existing session by refresh token
        const existingSession = await sessionRepository.findByRefreshTokenId(refreshToken);
        let session;
        if (existingSession) {
            // Update existing session
            await sessionRepository.updateLastActive(existingSession.id, { device_info: deviceInfo });
            session = existingSession;
            // Check for suspicious location changes
            if ((0, deviceDetection_1.areLocationsSuspicious)(existingSession.location, deviceInfo.location)) {
                logger_1.default.warn(`Suspicious location change detected for user ${user.id}`, {
                    userId: user.id,
                    sessionId: existingSession.id,
                    previousLocation: existingSession.location,
                    newLocation: deviceInfo.location
                });
                // Optional: Could force re-authentication here
                // For now, just log the event
            }
        }
        else {
            // Create new session
            const sessionToken = (0, deviceDetection_1.generateSessionToken)();
            const expiresAt = (0, deviceDetection_1.calculateSessionExpiration)(30); // 30 days
            session = await sessionRepository.create({
                user_id: parseInt(user.id.toString()),
                session_token: sessionToken,
                refresh_token_id: refreshToken,
                device_info: deviceInfo,
                expires_at: expiresAt
            });
        }
        // Generate new access token
        const newAccessToken = (0, jwt_1.generateAccessToken)(user);
        // Update user's last login
        await userRepository.updateLastLogin(user.id);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken,
                sessionId: session.id,
                expiresAt: session.expires_at
            }
        });
    }
    catch (error) {
        logger_1.default.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            error: 'INVALID_REFRESH_TOKEN'
        });
    }
};
exports.refreshTokenWithSession = refreshTokenWithSession;
/**
 * Get all active sessions for the current user
 */
const getUserSessions = async (req, res) => {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const userId = parseInt(req.user.userId);
        const currentSessionId = (_a = req.userSession) === null || _a === void 0 ? void 0 : _a.id;
        const sessionList = await sessionRepository.findActiveByUserId(userId, currentSessionId);
        res.status(200).json({
            success: true,
            message: 'Sessions retrieved successfully',
            data: sessionList
        });
    }
    catch (error) {
        logger_1.default.error('Error getting user sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve sessions',
            error: 'SERVER_ERROR'
        });
    }
};
exports.getUserSessions = getUserSessions;
/**
 * Get session statistics for the current user
 */
const getSessionStats = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const userId = parseInt(req.user.userId);
        const stats = await sessionRepository.getStatsForUser(userId);
        res.status(200).json({
            success: true,
            message: 'Session statistics retrieved successfully',
            data: stats
        });
    }
    catch (error) {
        logger_1.default.error('Error getting session stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve session statistics',
            error: 'SERVER_ERROR'
        });
    }
};
exports.getSessionStats = getSessionStats;
/**
 * Revoke a specific session
 */
const revokeSession = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({
                success: false,
                message: 'Session ID is required',
                error: 'MISSING_SESSION_ID'
            });
            return;
        }
        // Verify session belongs to the user
        const session = await sessionRepository.findById(sessionId);
        if (!session || session.user_id !== parseInt(req.user.userId)) {
            res.status(404).json({
                success: false,
                message: 'Session not found',
                error: 'SESSION_NOT_FOUND'
            });
            return;
        }
        // Revoke the session
        const revoked = await sessionRepository.revoke({
            session_id: sessionId,
            revoked_by: 'user'
        });
        if (revoked) {
            res.status(200).json({
                success: true,
                message: 'Session revoked successfully'
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Session could not be revoked',
                error: 'REVOKE_FAILED'
            });
        }
    }
    catch (error) {
        logger_1.default.error('Error revoking session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke session',
            error: 'SERVER_ERROR'
        });
    }
};
exports.revokeSession = revokeSession;
/**
 * Revoke all sessions except the current one
 */
const revokeAllSessions = async (req, res) => {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const userId = parseInt(req.user.userId);
        const currentSessionId = (_a = req.userSession) === null || _a === void 0 ? void 0 : _a.id;
        const revokedCount = await sessionRepository.revokeAllForUser(userId, currentSessionId, 'user');
        res.status(200).json({
            success: true,
            message: `Successfully revoked ${revokedCount} sessions`,
            data: {
                revokedCount
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error revoking all sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke sessions',
            error: 'SERVER_ERROR'
        });
    }
};
exports.revokeAllSessions = revokeAllSessions;
/**
 * Get filtered sessions (admin/debug endpoint)
 */
const getFilteredSessions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const userId = parseInt(req.user.userId);
        const { status, device_type, location, limit = 20, offset = 0 } = req.query;
        const filter = {
            user_id: userId,
            status: status,
            device_type: device_type,
            location: location,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        const sessionList = await sessionRepository.findWithFilter(filter);
        res.status(200).json({
            success: true,
            message: 'Filtered sessions retrieved successfully',
            data: sessionList
        });
    }
    catch (error) {
        logger_1.default.error('Error getting filtered sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve filtered sessions',
            error: 'SERVER_ERROR'
        });
    }
};
exports.getFilteredSessions = getFilteredSessions;
/**
 * Check for suspicious sessions
 */
const checkSuspiciousSessions = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const userId = parseInt(req.user.userId);
        const timeWindowHours = parseInt(req.query.hours) || 24;
        const suspiciousSessions = await sessionRepository.findSuspiciousSessions(userId, timeWindowHours);
        res.status(200).json({
            success: true,
            message: 'Suspicious sessions check completed',
            data: {
                suspiciousSessions,
                count: suspiciousSessions.length,
                timeWindow: `${timeWindowHours} hours`
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error checking suspicious sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check suspicious sessions',
            error: 'SERVER_ERROR'
        });
    }
};
exports.checkSuspiciousSessions = checkSuspiciousSessions;
/**
 * Clean up expired sessions (admin/maintenance endpoint)
 */
const cleanupExpiredSessions = async (req, res) => {
    try {
        // This could be protected by admin middleware
        const deletedCount = await sessionRepository.cleanupExpired();
        res.status(200).json({
            success: true,
            message: 'Session cleanup completed',
            data: {
                deletedCount
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error cleaning up expired sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired sessions',
            error: 'SERVER_ERROR'
        });
    }
};
exports.cleanupExpiredSessions = cleanupExpiredSessions;
/**
 * Middleware to attach session information to request
 */
const attachSessionInfo = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }
        // Try to find session by current request
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }
        // Decode token to get refresh token ID if available
        const decoded = (0, jwt_1.decodeToken)(token);
        if (decoded && decoded.tokenType === 'refresh') {
            const session = await sessionRepository.findByRefreshTokenId(token);
            if (session) {
                req.userSession = session;
            }
        }
        next();
    }
    catch (error) {
        logger_1.default.error('Error attaching session info:', error);
        next(); // Continue even if session attachment fails
    }
};
exports.attachSessionInfo = attachSessionInfo;
