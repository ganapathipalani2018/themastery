import { Request, Response } from 'express';
import { SessionRepository } from '../repositories/SessionRepository';
import { UserRepository } from '../repositories/UserRepository';
import { 
  verifyRefreshToken, 
  generateAccessToken,
  decodeToken 
} from '../utils/jwt';
import { 
  extractDeviceInfo, 
  generateSessionToken, 
  calculateSessionExpiration,
  areLocationsSuspicious
} from '../utils/deviceDetection';
import { Session, SessionFilter } from '../models/Session';
import logger from '../config/logger';

const sessionRepository = new SessionRepository();
const userRepository = new UserRepository();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isVerified: boolean;
  };
  userSession?: Session;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RevokeSessionRequest {
  sessionId: string;
}

/**
 * Enhanced refresh token endpoint with session tracking
 */
export const refreshTokenWithSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
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
    const deviceInfo = extractDeviceInfo(req);
    
    // Find existing session by refresh token
    const existingSession = await sessionRepository.findByRefreshTokenId(refreshToken);
    
    let session: Session;
    
    if (existingSession) {
      // Update existing session
      await sessionRepository.updateLastActive(existingSession.id, { device_info: deviceInfo });
      session = existingSession;
      
      // Check for suspicious location changes
      if (areLocationsSuspicious(existingSession.location, deviceInfo.location)) {
        logger.warn(`Suspicious location change detected for user ${user.id}`, {
          userId: user.id,
          sessionId: existingSession.id,
          previousLocation: existingSession.location,
          newLocation: deviceInfo.location
        });
        
        // Optional: Could force re-authentication here
        // For now, just log the event
      }
    } else {
      // Create new session
      const sessionToken = generateSessionToken();
      const expiresAt = calculateSessionExpiration(30); // 30 days
      
      session = await sessionRepository.create({
        user_id: parseInt(user.id.toString(), 10),
        session_token: sessionToken,
        refresh_token_id: refreshToken,
        device_info: deviceInfo,
        expires_at: expiresAt
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);
    
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

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * Get all active sessions for the current user
 */
export const getUserSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.user.userId, 10);
    const currentSessionId = req.userSession?.id;

    const sessionList = await sessionRepository.findActiveByUserId(userId, currentSessionId);
    
    res.status(200).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: sessionList
    });

  } catch (error) {
    logger.error('Error getting user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get session statistics for the current user
 */
export const getSessionStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.user.userId, 10);
    const stats = await sessionRepository.getStatsForUser(userId);
    
    res.status(200).json({
      success: true,
      message: 'Session statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    logger.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session statistics',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const { sessionId }: RevokeSessionRequest = req.body;

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
    if (!session || session.user_id !== parseInt(req.user.userId, 10)) {
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
    } else {
      res.status(400).json({
        success: false,
        message: 'Session could not be revoked',
        error: 'REVOKE_FAILED'
      });
    }

  } catch (error) {
    logger.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke session',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Revoke all sessions except the current one
 */
export const revokeAllSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.user.userId, 10);
    const currentSessionId = req.userSession?.id;

    const revokedCount = await sessionRepository.revokeAllForUser(userId, currentSessionId, 'user');
    
    res.status(200).json({
      success: true,
      message: `Successfully revoked ${revokedCount} sessions`,
      data: {
        revokedCount
      }
    });

  } catch (error) {
    logger.error('Error revoking all sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke sessions',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Get filtered sessions (admin/debug endpoint)
 */
export const getFilteredSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.user.userId, 10);
    const {
      status,
      device_type,
      location,
      limit = 20,
      offset = 0
    } = req.query;

    const filter: SessionFilter = {
      user_id: userId,
      status: status as any,
      device_type: device_type as string,
      location: location as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    const sessionList = await sessionRepository.findWithFilter(filter);
    
    res.status(200).json({
      success: true,
      message: 'Filtered sessions retrieved successfully',
      data: sessionList
    });

  } catch (error) {
    logger.error('Error getting filtered sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filtered sessions',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Check for suspicious sessions
 */
export const checkSuspiciousSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const userId = parseInt(req.user.userId, 10);
    const timeWindowHours = parseInt(req.query.hours as string, 10) || 24;

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

  } catch (error) {
    logger.error('Error checking suspicious sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check suspicious sessions',
      error: 'SERVER_ERROR'
    });
  }
};

/**
 * Clean up expired sessions (admin/maintenance endpoint)
 */
// eslint-disable-next-line consistent-return
export const cleanupExpiredSessions = async (req: Request, res: Response): Promise<void> => {
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

  } catch (error) {
    logger.error('Error cleaning up expired sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired sessions',
      error: 'SERVER_ERROR'
    });
  }
  return undefined;
};

/**
 * Middleware to attach session information to request
 */
// eslint-disable-next-line consistent-return
export const attachSessionInfo = async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
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
    const decoded = decodeToken(token);
    if (decoded && decoded.tokenType === 'refresh') {
      const session = await sessionRepository.findByRefreshTokenId(token);
      if (session) {
        req.userSession = session;
      }
    }

    next();
  } catch (error) {
    logger.error('Error attaching session info:', error);
    next(); // Continue even if session attachment fails
  }
}; 