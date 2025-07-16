"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlinkGoogleAccount = exports.linkGoogleAccount = exports.handleGoogleOAuthCallback = exports.initiateGoogleOAuth = void 0;
const google_auth_library_1 = require("google-auth-library");
const crypto_1 = __importDefault(require("crypto"));
const UserRepository_1 = require("../repositories/UserRepository");
const jwt_1 = require("../utils/jwt");
const logger_1 = __importDefault(require("../config/logger"));
const userRepository = new UserRepository_1.UserRepository();
// OAuth client configuration
const oauth2Client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
// Generate secure random string for state parameter
const generateSecureRandomString = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
// Generate PKCE code verifier and challenge
const generatePKCE = () => {
    const verifier = generateSecureRandomString(64);
    const challenge = crypto_1.default
        .createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    return { verifier, challenge };
};
/**
 * Initiate Google OAuth flow
 */
const initiateGoogleOAuth = (req, res) => {
    var _a;
    try {
        // Initialize session if not exists
        if (!req.session) {
            req.session = {};
        }
        // Generate and store state parameter for CSRF protection
        const state = generateSecureRandomString();
        req.session.oauthState = state;
        // Generate and store PKCE verifier (simplified for now)
        const { verifier } = generatePKCE();
        req.session.codeVerifier = verifier;
        // Generate authentication URL (simplified without PKCE for now to avoid type issues)
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            state: state,
            prompt: 'consent' // Force consent screen to ensure refresh token
        });
        logger_1.default.info('Google OAuth flow initiated', {
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            state: state.substring(0, 10) + '...'
        });
        res.redirect(authUrl);
    }
    catch (error) {
        logger_1.default.error('Error initiating Google OAuth flow', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate OAuth flow',
            error: 'OAUTH_INITIATION_ERROR'
        });
    }
};
exports.initiateGoogleOAuth = initiateGoogleOAuth;
/**
 * Handle Google OAuth callback
 */
const handleGoogleOAuthCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;
        // Check if user cancelled the OAuth flow
        if (error) {
            logger_1.default.warn('Google OAuth cancelled by user', { error });
            res.redirect('/login?error=oauth_cancelled');
            return;
        }
        // Initialize session if not exists
        if (!req.session) {
            req.session = {};
        }
        // Verify state parameter to prevent CSRF attacks
        if (state !== req.session.oauthState) {
            logger_1.default.warn('OAuth state verification failed', {
                expected: req.session.oauthState,
                received: state
            });
            res.redirect('/login?error=invalid_state');
            return;
        }
        // Clear state from session
        req.session.oauthState = undefined;
        if (!code) {
            res.redirect('/login?error=missing_code');
            return;
        }
        // Exchange code for tokens using PKCE verifier
        const tokenResponse = await oauth2Client.getToken({
            code: code,
            codeVerifier: req.session.codeVerifier || undefined
        });
        const tokens = tokenResponse.tokens;
        // Clear code verifier from session
        req.session.codeVerifier = undefined;
        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`
            }
        });
        if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info from Google');
        }
        const googleUser = await userInfoResponse.json();
        logger_1.default.info('Google user info retrieved', {
            googleId: googleUser.sub,
            email: googleUser.email,
            emailVerified: googleUser.email_verified
        });
        // Find or create user
        let user = await userRepository.findByGoogleId(googleUser.sub);
        if (!user) {
            // Check if user exists with this email
            const existingUser = await userRepository.findByEmail(googleUser.email);
            if (existingUser) {
                // Email exists but not linked to Google
                if (!existingUser.is_verified) {
                    // If email not verified, we can link automatically
                    user = await userRepository.linkGoogleAccount(existingUser.id, googleUser.sub, tokens.refresh_token || undefined);
                    logger_1.default.info('Google account linked to existing unverified user', {
                        userId: existingUser.id,
                        googleId: googleUser.sub
                    });
                }
                else {
                    // Email verified through different method - redirect to account linking
                    logger_1.default.info('Email exists with verified account, redirecting to link page', {
                        email: googleUser.email,
                        googleId: googleUser.sub
                    });
                    res.redirect(`/link-account?email=${encodeURIComponent(googleUser.email)}&googleId=${googleUser.sub}`);
                    return;
                }
            }
            else {
                // Create new user
                const oauthRequest = {
                    email: googleUser.email,
                    first_name: googleUser.given_name,
                    last_name: googleUser.family_name,
                    google_id: googleUser.sub,
                    profile_picture_url: googleUser.picture,
                    google_refresh_token: tokens.refresh_token ? tokens.refresh_token : undefined
                };
                user = await userRepository.createOAuthUser(oauthRequest);
                logger_1.default.info('New user created via Google OAuth', {
                    userId: user.id,
                    email: user.email,
                    googleId: googleUser.sub
                });
            }
        }
        else {
            // Update refresh token if provided
            if (tokens.refresh_token) {
                await userRepository.updateGoogleRefreshToken(user.id, tokens.refresh_token);
            }
            logger_1.default.info('Existing Google user logged in', {
                userId: user.id,
                googleId: googleUser.sub
            });
        }
        // Ensure user exists at this point
        if (!user) {
            throw new Error('User creation/retrieval failed');
        }
        // Update last login
        await userRepository.updateLastLogin(user.id);
        // Generate JWT tokens
        const jwtTokens = (0, jwt_1.generateTokenPair)(user);
        // Set JWT in HTTP-only cookie
        res.cookie('auth_token', jwtTokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        // Set refresh token in HTTP-only cookie
        res.cookie('refresh_token', jwtTokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        // Redirect to dashboard
        res.redirect('/dashboard');
    }
    catch (error) {
        logger_1.default.error('Google OAuth callback error', error);
        res.redirect('/login?error=oauth_failure');
    }
};
exports.handleGoogleOAuthCallback = handleGoogleOAuthCallback;
/**
 * Link Google account to existing user
 */
const linkGoogleAccount = async (req, res) => {
    try {
        const { email, password, googleId } = req.body;
        // Validate required fields
        if (!email || !password || !googleId) {
            res.status(400).json({
                success: false,
                message: 'All fields are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }
        // Find and verify user credentials
        const user = await userRepository.findByEmail(email.toLowerCase());
        if (!user || !user.password_hash) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS'
            });
            return;
        }
        // Verify password (assuming you have a password verification function)
        const { verifyPassword } = await Promise.resolve().then(() => __importStar(require('../utils/password')));
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS'
            });
            return;
        }
        // Check if Google ID is already linked to another account
        const existingGoogleUser = await userRepository.findByGoogleId(googleId);
        if (existingGoogleUser) {
            res.status(409).json({
                success: false,
                message: 'Google account is already linked to another user',
                error: 'GOOGLE_ACCOUNT_ALREADY_LINKED'
            });
            return;
        }
        // Link Google account
        const updatedUser = await userRepository.linkGoogleAccount(user.id, googleId);
        if (!updatedUser) {
            res.status(500).json({
                success: false,
                message: 'Failed to link Google account',
                error: 'LINK_FAILED'
            });
            return;
        }
        // Update last login
        await userRepository.updateLastLogin(updatedUser.id);
        // Generate JWT tokens
        const tokens = (0, jwt_1.generateTokenPair)(updatedUser);
        // Set JWT in HTTP-only cookie
        res.cookie('auth_token', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        // Set refresh token in HTTP-only cookie
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        logger_1.default.info('Google account linked successfully', {
            userId: updatedUser.id,
            googleId: googleId
        });
        res.status(200).json({
            success: true,
            message: 'Google account linked successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    isVerified: updatedUser.is_verified,
                    googleLinked: true
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Account linking error', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.linkGoogleAccount = linkGoogleAccount;
/**
 * Unlink Google account from user
 */
const unlinkGoogleAccount = async (req, res) => {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error: 'AUTHENTICATION_REQUIRED'
            });
            return;
        }
        const user = await userRepository.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
            return;
        }
        // Check if user has a password (can't unlink if OAuth is the only auth method)
        if (!user.password_hash) {
            res.status(400).json({
                success: false,
                message: 'Cannot unlink Google account without setting a password first',
                error: 'PASSWORD_REQUIRED'
            });
            return;
        }
        // Unlink Google account
        const updatedUser = await userRepository.updateUser(userId, {
            google_id: undefined,
            google_refresh_token: undefined
        });
        if (!updatedUser) {
            res.status(500).json({
                success: false,
                message: 'Failed to unlink Google account',
                error: 'UNLINK_FAILED'
            });
            return;
        }
        logger_1.default.info('Google account unlinked successfully', {
            userId: userId,
            googleId: user.google_id
        });
        res.status(200).json({
            success: true,
            message: 'Google account unlinked successfully',
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    isVerified: updatedUser.is_verified,
                    googleLinked: false
                }
            }
        });
    }
    catch (error) {
        logger_1.default.error('Account unlinking error', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
exports.unlinkGoogleAccount = unlinkGoogleAccount;
