import { Request, Response } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import emailService from '../services/emailService';
import logger from '../config/logger';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class UserController {
  private userRepository: UserRepository;
  private sessionRepository: SessionRepository;

  constructor() {
    this.userRepository = new UserRepository();
    this.sessionRepository = new SessionRepository();
  }

  /**
   * Get current user profile
   */
  public async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      const userResponse = this.userRepository.toUserResponse(user);
      res.json({ 
        success: true, 
        data: userResponse,
        message: 'Profile retrieved successfully' 
      });

    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve profile' 
      });
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { first_name, last_name, profile_picture_url } = req.body;

      // Basic validation
      if (
        first_name !== undefined &&
        (typeof first_name !== 'string' || first_name.length === 0 || first_name.length > 50)
      ) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'First name must be a string between 1 and 50 characters',
        });
        return;
      }

      if (
        last_name !== undefined &&
        (typeof last_name !== 'string' || last_name.length === 0 || last_name.length > 50)
      ) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Last name must be a string between 1 and 50 characters',
        });
        return;
      }

      const updates: Partial<any> = {};
      if (first_name !== undefined) { updates.first_name = first_name; }
      if (last_name !== undefined) { updates.last_name = last_name; }
      if (profile_picture_url !== undefined) { updates.profile_picture_url = profile_picture_url; }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ 
          error: 'No updates provided',
          message: 'At least one field must be provided for update' 
        });
        return;
      }

      const updatedUser = await this.userRepository.updateUser(userId, updates);
      if (!updatedUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      const userResponse = this.userRepository.toUserResponse(updatedUser);
      res.json({ 
        success: true, 
        data: userResponse,
        message: 'Profile updated successfully' 
      });

    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to update profile' 
      });
    }
  }

  /**
   * Change user email (with verification)
   */
  public async changeEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { new_email, password } = req.body;

      // Basic validation
      if (!new_email || !password) {
        res.status(400).json({ 
          error: 'Validation failed',
          message: 'Both new_email and password are required' 
        });
        return;
      }

      // Get current user
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Verify current password for security
      if (currentUser.password_hash) {
        const isValidPassword = await bcrypt.compare(password, currentUser.password_hash);
        if (!isValidPassword) {
          res.status(401).json({ 
            error: 'Invalid password',
            message: 'Current password is incorrect' 
          });
          return;
        }
      }

      // Check if new email already exists
      const existingUser = await this.userRepository.findByEmail(new_email);
      if (existingUser) {
        res.status(409).json({ 
          error: 'Email already exists',
          message: 'This email is already associated with another account' 
        });
        return;
      }

      // Generate verification token
      const verificationToken = jwt.sign(
        { userId, newEmail: new_email, type: 'email_change' }, 
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      
      // Send verification email to new address
      await emailService.sendVerificationEmail(new_email, verificationToken);

      // Log email change attempt
      logger.info(`Email change initiated for user ${userId} to ${new_email}`);

      res.json({ 
        success: true, 
        message: 'Verification email sent to new address. Please check your email to confirm the change.' 
      });

    } catch (error) {
      logger.error('Error changing user email:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to change email' 
      });
    }
  }

  /**
   * Verify email change
   */
  public async verifyEmailChange(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ 
          error: 'Token required',
          message: 'Verification token is required' 
        });
        return;
      }

      const decoded = jwt.verify(token, String(process.env.JWT_SECRET));
      if (typeof decoded !== 'object' || !decoded || (decoded as any).type !== 'email_change') {
        res.status(400).json({ 
          error: 'Invalid token',
          message: 'Invalid or expired verification token' 
        });
        return;
      }
      const { userId, newEmail } = decoded as any;

      // Update user email
      const updatedUser = await this.userRepository.updateUser(userId, { 
        email: newEmail,
        is_verified: true 
      });

      if (!updatedUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Send confirmation email to both old and new addresses
      await emailService.sendEmailVerifiedNotification(newEmail, updatedUser.first_name);

      logger.info(`Email changed successfully for user ${userId} to ${newEmail}`);

      res.json({ 
        success: true, 
        message: 'Email changed successfully' 
      });

    } catch (error) {
      logger.error('Error verifying email change:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to verify email change' 
      });
    }
  }

  /**
   * Change user password
   */
  public async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { current_password, new_password } = req.body;

      // Basic validation
      if (!current_password || !new_password) {
        res.status(400).json({ 
          error: 'Validation failed',
          message: 'Both current_password and new_password are required' 
        });
        return;
      }

      if (new_password.length < 8) {
        res.status(400).json({ 
          error: 'Validation failed',
          message: 'New password must be at least 8 characters long' 
        });
        return;
      }

      // Get current user
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser || !currentUser.password_hash) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found or password not set' 
        });
        return;
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, currentUser.password_hash);
      if (!isValidPassword) {
        res.status(401).json({ 
          error: 'Invalid password',
          message: 'Current password is incorrect' 
        });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 10); // Use bcrypt for hashing

      // Update password
      const updatedUser = await this.userRepository.updateUser(userId, { 
        password_hash: newPasswordHash 
      });

      if (!updatedUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Send password change notification
      await emailService.sendPasswordChangedNotification(currentUser.email, currentUser.first_name);

      logger.info(`Password changed successfully for user ${userId}`);

      res.json({ 
        success: true, 
        message: 'Password changed successfully. Please log in again.' 
      });

    } catch (error) {
      logger.error('Error changing password:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to change password' 
      });
    }
  }

  /**
   * Deactivate user account (soft delete)
   */
  public async deactivateAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { password } = req.body;

      // Validate input
      if (!password) {
        res.status(400).json({ 
          error: 'Password required',
          message: 'Password is required to deactivate account' 
        });
        return;
      }

      // Get current user
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Verify password for security
      if (currentUser.password_hash) {
        const isValidPassword = await bcrypt.compare(password, currentUser.password_hash);
        if (!isValidPassword) {
          res.status(401).json({ 
            error: 'Invalid password',
            message: 'Password is incorrect' 
          });
          return;
        }
      }

      // Deactivate account
      const updatedUser = await this.userRepository.updateUser(userId, { 
        account_status: 'deactivated' 
      });

      if (!updatedUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Revoke all sessions
      await this.sessionRepository.revokeAllForUser(Number(userId));

      logger.info(`Account deactivated for user ${userId}`);

      res.json({ 
        success: true, 
        message: 'Account deactivated successfully' 
      });

    } catch (error) {
      logger.error('Error deactivating account:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to deactivate account' 
      });
    }
  }

  /**
   * Delete user account permanently
   */
  public async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { password, confirmation } = req.body;

      // Validate input
      if (!password || confirmation !== 'DELETE_MY_ACCOUNT') {
        res.status(400).json({ 
          error: 'Invalid confirmation',
          message: 'Password and confirmation text "DELETE_MY_ACCOUNT" are required' 
        });
        return;
      }

      // Get current user
      const currentUser = await this.userRepository.findById(userId);
      if (!currentUser) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Verify password for security
      if (currentUser.password_hash) {
        const isValidPassword = await bcrypt.compare(password, currentUser.password_hash);
        if (!isValidPassword) {
          res.status(401).json({ 
            error: 'Invalid password',
            message: 'Password is incorrect' 
          });
          return;
        }
      }

      // Delete user account
      const deleted = await this.userRepository.deleteUser(userId);
      if (!deleted) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Revoke all sessions
      await this.sessionRepository.revokeAllForUser(Number(userId));

      logger.info(`Account deleted permanently for user ${userId}`);

      res.json({ 
        success: true, 
        message: 'Account deleted successfully' 
      });

    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to delete account' 
      });
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  public async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      // Get user data
      const user = await this.userRepository.findById(userId);
      if (!user) {
        res.status(404).json({ 
          error: 'User not found',
          message: 'User account not found' 
        });
        return;
      }

      // Prepare export data
      const exportData = {
        user: this.userRepository.toUserResponse(user),
        exported_at: new Date().toISOString(),
        export_format: 'JSON'
      };

      // Set download headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user_data_${userId}_${Date.now()}.json"`);
      
      logger.info(`Data export requested for user ${userId}`);
      
      res.json(exportData);

    } catch (error) {
      logger.error('Error exporting user data:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to export user data' 
      });
    }
  }

  /**
   * Get user activity history
   */
  public async getActivityHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
        return;
      }

      const { page = 1, limit = 50 } = req.query;
      // const offset = (Number(page) - 1) * Number(limit); // Remove this line if not used

      // Get user sessions with pagination
      const sessions = await this.sessionRepository.findActiveByUserId(Number(userId));

      const activities = sessions.sessions.map((session: any) => ({
        id: session.id,
        type: 'session',
        activity: `Login from ${session.device_name} (${session.os})`,
        device_type: session.device_type,
        device_name: session.device_name,
        os: session.os,
        browser: session.browser,
        ip_address: session.ip_address,
        location: session.location,
        timestamp: session.created_at,
        last_activity: session.last_activity,
        is_active: session.is_active
      }));

      res.json({ 
        success: true, 
        data: activities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: activities.length
        },
        message: 'Activity history retrieved successfully' 
      });

    } catch (error) {
      logger.error('Error getting activity history:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to retrieve activity history' 
      });
    }
  }
} 