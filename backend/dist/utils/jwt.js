"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeToken = exports.extractTokenFromHeader = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokenPair = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const environment_1 = require("../config/environment");
/**
 * Generate access token for user
 */
const generateAccessToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        isVerified: user.is_verified
    };
    return jsonwebtoken_1.default.sign(payload, environment_1.jwtConfig.secret, {
        expiresIn: environment_1.jwtConfig.expiresIn,
        issuer: 'resume-builder',
        audience: 'resume-builder-users'
    });
};
exports.generateAccessToken = generateAccessToken;
/**
 * Generate refresh token for user
 */
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        tokenType: 'refresh'
    };
    return jsonwebtoken_1.default.sign(payload, environment_1.jwtConfig.refreshSecret, {
        expiresIn: environment_1.jwtConfig.refreshExpiresIn,
        issuer: 'resume-builder',
        audience: 'resume-builder-users'
    });
};
exports.generateRefreshToken = generateRefreshToken;
/**
 * Generate both access and refresh tokens
 */
const generateTokenPair = (user) => {
    return {
        accessToken: (0, exports.generateAccessToken)(user),
        refreshToken: (0, exports.generateRefreshToken)(user)
    };
};
exports.generateTokenPair = generateTokenPair;
/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.jwtConfig.secret, {
            issuer: 'resume-builder',
            audience: 'resume-builder-users'
        });
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired access token');
    }
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, environment_1.jwtConfig.refreshSecret, {
            issuer: 'resume-builder',
            audience: 'resume-builder-users'
        });
        return decoded;
    }
    catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Extract token from Authorization header
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
};
exports.extractTokenFromHeader = extractTokenFromHeader;
/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
    return jsonwebtoken_1.default.decode(token);
};
exports.decodeToken = decodeToken;
