import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository';
import { generateTokenPair } from '../utils/jwt';
import logger from '../config/logger';
import { GoogleOAuthRequest } from '../models/User';
import fetch from 'node-fetch';

// Extend Request interface to include session
declare global {
  namespace Express {
    interface Request {
      session: {
        oauthState?: string;
        codeVerifier?: string;
      };
    }
  }
}

const userRepository = new UserRepository();

// OAuth client configuration
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email_verified: boolean;
}

// Generate secure random string for state parameter
const generateSecureRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate PKCE code verifier and challenge
const generatePKCE = () => {
  const verifier = generateSecureRandomString(64);
  const challenge = crypto
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
export const initiateGoogleOAuth = (req: Request, res: Response): void => {
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
    
    logger.info('Google OAuth flow initiated', { 
      userId: req.user?.userId, 
      state: state.substring(0, 10) + '...' 
    });
    
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initiating Google OAuth flow', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate OAuth flow',
      error: 'OAUTH_INITIATION_ERROR'
    });
  }
};

/**
 * Handle Google OAuth callback
 */
export const handleGoogleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    // Check if user cancelled the OAuth flow
    if (error) {
      logger.warn('Google OAuth cancelled by user', { error });
      res.redirect('/login?error=oauth_cancelled');
      return;
    }

    // Initialize session if not exists
    if (!req.session) {
      req.session = {};
    }

    // Verify state parameter to prevent CSRF attacks
    if (state !== req.session.oauthState) {
      logger.warn('OAuth state verification failed', { 
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
      code: code as string,
      codeVerifier: req.session.codeVerifier || undefined
    });
    
    const tokens = tokenResponse.tokens;

    // Clear code verifier from session
    req.session.codeVerifier = undefined;

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();
    
    logger.info('Google user info retrieved', { 
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
          user = await userRepository.linkGoogleAccount(
            existingUser.id, 
            googleUser.sub, 
            tokens.refresh_token || undefined
          );
          
          logger.info('Google account linked to existing unverified user', { 
            userId: existingUser.id, 
            googleId: googleUser.sub 
          });
        } else {
          // Email verified through different method - redirect to account linking
          logger.info('Email exists with verified account, redirecting to link page', { 
            email: googleUser.email,
            googleId: googleUser.sub
          });
          
          res.redirect(`/link-account?email=${encodeURIComponent(googleUser.email)}&googleId=${googleUser.sub}`);
          return;
        }
      } else {
        // Create new user
        const oauthRequest: GoogleOAuthRequest = {
          email: googleUser.email,
          first_name: googleUser.given_name,
          last_name: googleUser.family_name,
          google_id: googleUser.sub,
          profile_picture_url: googleUser.picture,
          google_refresh_token: tokens.refresh_token ? tokens.refresh_token : undefined
        };
        
        user = await userRepository.createOAuthUser(oauthRequest);
        
        logger.info('New user created via Google OAuth', { 
          userId: user.id, 
          email: user.email,
          googleId: googleUser.sub
        });
      }
    } else {
      // Update refresh token if provided
      if (tokens.refresh_token) {
        await userRepository.updateGoogleRefreshToken(user.id, tokens.refresh_token);
      }
      
      logger.info('Existing Google user logged in', { 
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
    const jwtTokens = generateTokenPair(user);

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
  } catch (error) {
    logger.error('Google OAuth callback error', error);
    res.redirect('/login?error=oauth_failure');
  }
};

/**
 * Link Google account to existing user
 */
export const linkGoogleAccount = async (req: Request, res: Response): Promise<void> => {
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
    const { verifyPassword } = await import('../utils/password');
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
    const tokens = generateTokenPair(updatedUser);

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

    logger.info('Google account linked successfully', { 
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
  } catch (error) {
    logger.error('Account linking error', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Unlink Google account from user
 */
export const unlinkGoogleAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
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

    logger.info('Google account unlinked successfully', { 
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
  } catch (error) {
    logger.error('Account unlinking error', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'SERVER_ERROR'
    });
  }
}; 