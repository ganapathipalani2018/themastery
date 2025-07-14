"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSameUser = exports.optionalAuth = exports.requireVerifiedUser = exports.authenticateToken = void 0;
const jwt_1 = require("../utils/jwt");
/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
    try {
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token is required',
                error: 'MISSING_TOKEN'
            });
            return;
        }
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (_a) {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: 'INVALID_TOKEN'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Middleware to check if user is verified
 */
const requireVerifiedUser = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'AUTHENTICATION_REQUIRED'
        });
        return;
    }
    if (!req.user.isVerified) {
        res.status(403).json({
            success: false,
            message: 'Email verification required',
            error: 'EMAIL_NOT_VERIFIED'
        });
        return;
    }
    next();
};
exports.requireVerifiedUser = requireVerifiedUser;
/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
    try {
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (token) {
            const decoded = (0, jwt_1.verifyAccessToken)(token);
            req.user = decoded;
        }
    }
    catch (_a) {
        // Silently ignore invalid tokens for optional auth
    }
    next();
};
exports.optionalAuth = optionalAuth;
/**
 * Middleware to check if the authenticated user matches the requested user ID
 */
const requireSameUser = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const requestedUserId = req.params[userIdParam];
        if (req.user.userId !== requestedUserId) {
            res.status(403).json({
                success: false,
                message: 'Access denied: You can only access your own resources',
                error: 'ACCESS_DENIED'
            });
            return;
        }
        next();
    };
};
exports.requireSameUser = requireSameUser;
