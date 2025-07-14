"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.resetPassword = exports.requestPasswordReset = exports.verifyEmail = exports.refreshToken = exports.login = exports.register = void 0;
const UserRepository_1 = require("../repositories/UserRepository");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const crypto_1 = __importDefault(require("crypto"));
const userRepository = new UserRepository_1.UserRepository();
/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            res.status(400).json({
                success: false,
                message: 'All fields are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format',
                error: 'INVALID_EMAIL'
            });
            return;
        }
        // Validate password strength
        const passwordValidation = (0, password_1.validatePasswordStrength)(password);
        if (!passwordValidation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Password does not meet requirements',
                error: 'WEAK_PASSWORD',
                details: passwordValidation.errors
            });
            return;
        }
        // Check if user already exists
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: 'User with this email already exists',
                error: 'USER_EXISTS'
            });
            return;
        }
        // Hash password
        const hashedPassword = await (0, password_1.hashPassword)(password);
        // Create user
        const newUser = await userRepository.createUser({
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            password: '' // This field is required by CreateUserRequest but not used
        });
        // Generate tokens
        const tokens = (0, jwt_1.generateTokenPair)(newUser);
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for verification.',
            data: {
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    firstName: newUser.first_name,
                    lastName: newUser.last_name,
                    isVerified: newUser.is_verified
                },
                tokens
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.register = register;
/**
 * Login user
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate required fields
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: 'Email and password are required',
                error: 'MISSING_CREDENTIALS'
            });
            return;
        }
        // Find user by email
        const user = await userRepository.findByEmail(email.toLowerCase());
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS'
            });
            return;
        }
        // Verify password
        const isPasswordValid = await (0, password_1.verifyPassword)(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS'
            });
            return;
        }
        // Generate tokens
        const tokens = (0, jwt_1.generateTokenPair)(user);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isVerified: user.is_verified
                },
                tokens
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.login = login;
/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
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
        // Generate new access token
        const newAccessToken = (0, jwt_1.generateAccessToken)(user);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                accessToken: newAccessToken
            }
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            error: 'INVALID_REFRESH_TOKEN'
        });
    }
};
exports.refreshToken = refreshToken;
/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            res.status(400).json({
                success: false,
                message: 'Verification token is required',
                error: 'MISSING_TOKEN'
            });
            return;
        }
        // Verify user with token
        const user = await userRepository.verifyUserByToken(token);
        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token',
                error: 'INVALID_TOKEN'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isVerified: user.is_verified
                }
            }
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.verifyEmail = verifyEmail;
/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: 'Email is required',
                error: 'MISSING_EMAIL'
            });
            return;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        // Set reset token (this will succeed even if user doesn't exist for security)
        await userRepository.setResetPasswordToken(email.toLowerCase(), resetToken, resetTokenExpiry);
        res.status(200).json({
            success: true,
            message: 'If an account with this email exists, a password reset link has been sent'
        });
    }
    catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.requestPasswordReset = requestPasswordReset;
/**
 * Reset password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Reset token and new password are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }
        // Validate password strength
        const passwordValidation = (0, password_1.validatePasswordStrength)(newPassword);
        if (!passwordValidation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Password does not meet requirements',
                error: 'WEAK_PASSWORD',
                details: passwordValidation.errors
            });
            return;
        }
        // Hash new password
        const hashedPassword = await (0, password_1.hashPassword)(newPassword);
        // Reset password
        const user = await userRepository.resetPassword(token, hashedPassword);
        if (!user) {
            res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token',
                error: 'INVALID_TOKEN'
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.resetPassword = resetPassword;
/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const user = await userRepository.findById(req.user.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isVerified: user.is_verified,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                }
            }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.getProfile = getProfile;
