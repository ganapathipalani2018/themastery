"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCleanupService = exports.SessionCleanupService = void 0;
const SessionRepository_1 = require("../repositories/SessionRepository");
const logger_1 = __importDefault(require("../config/logger"));
class SessionCleanupService {
    constructor() {
        this.cleanupInterval = null;
        this.sessionRepository = new SessionRepository_1.SessionRepository();
    }
    /**
     * Start the cleanup service with specified interval
     */
    start(intervalHours = 24) {
        if (this.cleanupInterval) {
            logger_1.default.warn('Session cleanup service is already running');
            return;
        }
        const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds
        // Run cleanup immediately on start
        this.runCleanup();
        // Schedule periodic cleanup
        this.cleanupInterval = setInterval(() => {
            this.runCleanup();
        }, intervalMs);
        logger_1.default.info(`Session cleanup service started with ${intervalHours} hour interval`);
    }
    /**
     * Stop the cleanup service
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger_1.default.info('Session cleanup service stopped');
        }
    }
    /**
     * Run the cleanup process
     */
    async runCleanup() {
        try {
            logger_1.default.info('Starting session cleanup process');
            // Clean up expired sessions
            const expiredCount = await this.sessionRepository.cleanupExpired();
            // Clean up old revoked sessions (older than 30 days)
            const oldRevokedCount = await this.sessionRepository.deleteOldRevokedSessions(30);
            logger_1.default.info(`Session cleanup completed: ${expiredCount} expired sessions, ${oldRevokedCount} old revoked sessions removed`);
            // Optional: Log cleanup statistics
            await this.logCleanupStats();
        }
        catch (error) {
            logger_1.default.error('Error during session cleanup:', error);
        }
    }
    /**
     * Log cleanup statistics
     */
    async logCleanupStats() {
        try {
            // This could be enhanced to track cleanup metrics over time
            logger_1.default.debug('Session cleanup statistics logged');
        }
        catch (error) {
            logger_1.default.error('Error logging cleanup stats:', error);
        }
    }
    /**
     * Manually trigger cleanup (for testing or admin purposes)
     */
    async manualCleanup() {
        try {
            logger_1.default.info('Manual session cleanup triggered');
            const expiredCount = await this.sessionRepository.cleanupExpired();
            const oldRevokedCount = await this.sessionRepository.deleteOldRevokedSessions(30);
            logger_1.default.info(`Manual cleanup completed: ${expiredCount} expired, ${oldRevokedCount} old revoked sessions removed`);
            return { expiredCount, oldRevokedCount };
        }
        catch (error) {
            logger_1.default.error('Error during manual cleanup:', error);
            throw error;
        }
    }
    /**
     * Get cleanup service status
     */
    getStatus() {
        return {
            isRunning: this.cleanupInterval !== null,
            nextCleanup: this.cleanupInterval ? new Date(Date.now() + this.cleanupInterval._idleTimeout) : undefined
        };
    }
}
exports.SessionCleanupService = SessionCleanupService;
// Export singleton instance
exports.sessionCleanupService = new SessionCleanupService();
