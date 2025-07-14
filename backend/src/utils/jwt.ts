import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { jwtConfig } from '../config/environment';

export interface TokenPayload {
  userId: string;
  email: string;
  isVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access token for user
 */
export const generateAccessToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    isVerified: user.is_verified
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: 'resume-builder',
    audience: 'resume-builder-users'
  } as jwt.SignOptions);
};

/**
 * Generate refresh token for user
 */
export const generateRefreshToken = (user: User): string => {
  const payload = {
    userId: user.id,
    email: user.email,
    tokenType: 'refresh'
  };

  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: 'resume-builder',
    audience: 'resume-builder-users'
  } as jwt.SignOptions);
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (user: User): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: 'resume-builder',
      audience: 'resume-builder-users'
    }) as TokenPayload;
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
      issuer: 'resume-builder',
      audience: 'resume-builder-users'
    });
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
}; 