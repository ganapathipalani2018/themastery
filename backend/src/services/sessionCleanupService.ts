import { SessionRepository } from '../repositories/SessionRepository';
import logger from '../config/logger';

export class SessionCleanupService {
  private sessionRepository: SessionRepository;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionRepository = new SessionRepository();
  }

  /**
   * Start the cleanup service with specified interval
   */
  start(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      logger.warn('Session cleanup service is already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
    
    // Run cleanup immediately on start
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);

    logger.info(`Session cleanup service started with ${intervalHours} hour interval`);
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Session cleanup service stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  private async runCleanup(): Promise<void> {
    try {
      logger.info('Starting session cleanup process');
      
      // Clean up expired sessions
      const expiredCount = await this.sessionRepository.cleanupExpired();
      
      // Clean up old revoked sessions (older than 30 days)
      const oldRevokedCount = await this.sessionRepository.deleteOldRevokedSessions(30);
      
      logger.info(`Session cleanup completed: ${expiredCount} expired sessions, ${oldRevokedCount} old revoked sessions removed`);
      
      // Optional: Log cleanup statistics
      await this.logCleanupStats();
      
    } catch (error) {
      logger.error('Error during session cleanup:', error);
    }
  }

  /**
   * Log cleanup statistics
   */
  private async logCleanupStats(): Promise<void> {
    try {
      // This could be enhanced to track cleanup metrics over time
      logger.debug('Session cleanup statistics logged');
    } catch (error) {
      logger.error('Error logging cleanup stats:', error);
    }
  }

  /**
   * Manually trigger cleanup (for testing or admin purposes)
   */
  async manualCleanup(): Promise<{ expiredCount: number; oldRevokedCount: number }> {
    try {
      logger.info('Manual session cleanup triggered');
      
      const expiredCount = await this.sessionRepository.cleanupExpired();
      const oldRevokedCount = await this.sessionRepository.deleteOldRevokedSessions(30);
      
      logger.info(`Manual cleanup completed: ${expiredCount} expired, ${oldRevokedCount} old revoked sessions removed`);
      
      return { expiredCount, oldRevokedCount };
    } catch (error) {
      logger.error('Error during manual cleanup:', error);
      throw error;
    }
  }

  /**
   * Get cleanup service status
   */
  getStatus(): { isRunning: boolean; nextCleanup?: Date } {
    return {
      isRunning: this.cleanupInterval !== null,
      nextCleanup: this.cleanupInterval ? new Date(Date.now() + (this.cleanupInterval as any)._idleTimeout) : undefined
    };
  }
}

// Export singleton instance
export const sessionCleanupService = new SessionCleanupService(); 