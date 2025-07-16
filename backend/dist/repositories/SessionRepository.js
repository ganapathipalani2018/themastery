"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const db_1 = __importDefault(require("../db"));
const logger_1 = __importDefault(require("../config/logger"));
class SessionRepository {
    constructor() {
        this.pool = db_1.default;
    }
    /**
     * Create a new session
     */
    async create(sessionData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO sessions (
          user_id, session_token, refresh_token_id, device_type, browser, browser_version,
          operating_system, os_version, ip_address, location, country_code, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
            const values = [
                sessionData.user_id,
                sessionData.session_token,
                sessionData.refresh_token_id,
                (_a = sessionData.device_info) === null || _a === void 0 ? void 0 : _a.device_type,
                (_b = sessionData.device_info) === null || _b === void 0 ? void 0 : _b.browser,
                (_c = sessionData.device_info) === null || _c === void 0 ? void 0 : _c.browser_version,
                (_d = sessionData.device_info) === null || _d === void 0 ? void 0 : _d.operating_system,
                (_e = sessionData.device_info) === null || _e === void 0 ? void 0 : _e.os_version,
                (_f = sessionData.device_info) === null || _f === void 0 ? void 0 : _f.ip_address,
                (_g = sessionData.device_info) === null || _g === void 0 ? void 0 : _g.location,
                (_h = sessionData.device_info) === null || _h === void 0 ? void 0 : _h.country_code,
                sessionData.expires_at
            ];
            const result = await client.query(query, values);
            const session = result.rows[0];
            logger_1.default.info(`Session created for user ${sessionData.user_id}`, {
                sessionId: session.id,
                userId: sessionData.user_id,
                deviceType: (_j = sessionData.device_info) === null || _j === void 0 ? void 0 : _j.device_type,
                location: (_k = sessionData.device_info) === null || _k === void 0 ? void 0 : _k.location
            });
            return session;
        }
        catch (error) {
            logger_1.default.error('Error creating session:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Find session by ID
     */
    async findById(sessionId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM sessions 
        WHERE id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
      `;
            const result = await client.query(query, [sessionId]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error finding session by ID:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Find session by session token
     */
    async findBySessionToken(sessionToken) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM sessions 
        WHERE session_token = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
      `;
            const result = await client.query(query, [sessionToken]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error finding session by token:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Find session by refresh token ID
     */
    async findByRefreshTokenId(refreshTokenId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM sessions 
        WHERE refresh_token_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
      `;
            const result = await client.query(query, [refreshTokenId]);
            return result.rows[0] || null;
        }
        catch (error) {
            logger_1.default.error('Error finding session by refresh token ID:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get all active sessions for a user
     */
    async findActiveByUserId(userId, currentSessionId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT 
          id, device_type, browser, browser_version, operating_system, os_version,
          location, country_code, last_active, created_at, expires_at
        FROM sessions 
        WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
        ORDER BY last_active DESC
      `;
            const result = await client.query(query, [userId]);
            const sessions = result.rows.map(row => (Object.assign(Object.assign({}, row), { is_current: row.id === currentSessionId })));
            return {
                sessions,
                total: sessions.length,
                current_session_id: currentSessionId
            };
        }
        catch (error) {
            logger_1.default.error('Error finding active sessions for user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get sessions with filtering and pagination
     */
    async findWithFilter(filter) {
        const client = await this.pool.connect();
        try {
            let query = `
        SELECT 
          id, user_id, device_type, browser, browser_version, operating_system, os_version,
          location, country_code, last_active, created_at, expires_at, is_revoked
        FROM sessions 
        WHERE 1=1
      `;
            const values = [];
            let paramCount = 0;
            if (filter.user_id) {
                query += ` AND user_id = $${++paramCount}`;
                values.push(filter.user_id);
            }
            if (filter.status) {
                switch (filter.status) {
                    case 'active':
                        query += ` AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP`;
                        break;
                    case 'expired':
                        query += ` AND is_revoked = FALSE AND expires_at <= CURRENT_TIMESTAMP`;
                        break;
                    case 'revoked':
                        query += ` AND is_revoked = TRUE`;
                        break;
                }
            }
            if (filter.device_type) {
                query += ` AND device_type = $${++paramCount}`;
                values.push(filter.device_type);
            }
            if (filter.location) {
                query += ` AND location ILIKE $${++paramCount}`;
                values.push(`%${filter.location}%`);
            }
            if (filter.created_after) {
                query += ` AND created_at >= $${++paramCount}`;
                values.push(filter.created_after);
            }
            if (filter.created_before) {
                query += ` AND created_at <= $${++paramCount}`;
                values.push(filter.created_before);
            }
            query += ` ORDER BY last_active DESC`;
            if (filter.limit) {
                query += ` LIMIT $${++paramCount}`;
                values.push(filter.limit);
            }
            if (filter.offset) {
                query += ` OFFSET $${++paramCount}`;
                values.push(filter.offset);
            }
            const result = await client.query(query, values);
            const sessions = result.rows.map(row => (Object.assign(Object.assign({}, row), { is_current: false // Will be set by calling code if needed
             })));
            return {
                sessions,
                total: sessions.length
            };
        }
        catch (error) {
            logger_1.default.error('Error finding sessions with filter:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update session last active time
     */
    async updateLastActive(sessionId, updateData) {
        const client = await this.pool.connect();
        try {
            let query = `UPDATE sessions SET last_active = CURRENT_TIMESTAMP`;
            const values = [];
            let paramCount = 0;
            if (updateData === null || updateData === void 0 ? void 0 : updateData.device_info) {
                const deviceInfo = updateData.device_info;
                const updates = [];
                if (deviceInfo.device_type !== undefined) {
                    updates.push(`device_type = $${++paramCount}`);
                    values.push(deviceInfo.device_type);
                }
                if (deviceInfo.browser !== undefined) {
                    updates.push(`browser = $${++paramCount}`);
                    values.push(deviceInfo.browser);
                }
                if (deviceInfo.browser_version !== undefined) {
                    updates.push(`browser_version = $${++paramCount}`);
                    values.push(deviceInfo.browser_version);
                }
                if (deviceInfo.operating_system !== undefined) {
                    updates.push(`operating_system = $${++paramCount}`);
                    values.push(deviceInfo.operating_system);
                }
                if (deviceInfo.os_version !== undefined) {
                    updates.push(`os_version = $${++paramCount}`);
                    values.push(deviceInfo.os_version);
                }
                if (deviceInfo.ip_address !== undefined) {
                    updates.push(`ip_address = $${++paramCount}`);
                    values.push(deviceInfo.ip_address);
                }
                if (deviceInfo.location !== undefined) {
                    updates.push(`location = $${++paramCount}`);
                    values.push(deviceInfo.location);
                }
                if (deviceInfo.country_code !== undefined) {
                    updates.push(`country_code = $${++paramCount}`);
                    values.push(deviceInfo.country_code);
                }
                if (updates.length > 0) {
                    query += `, ${updates.join(', ')}`;
                }
            }
            query += ` WHERE id = $${++paramCount} AND is_revoked = FALSE`;
            values.push(sessionId);
            await client.query(query, values);
        }
        catch (error) {
            logger_1.default.error('Error updating session last active:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Revoke a session
     */
    async revoke(revokeData) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE sessions 
        SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP, revoked_by = $2
        WHERE id = $1 AND is_revoked = FALSE
      `;
            const result = await client.query(query, [revokeData.session_id, revokeData.revoked_by]);
            const revoked = (result.rowCount || 0) > 0;
            if (revoked) {
                logger_1.default.info(`Session revoked: ${revokeData.session_id} by ${revokeData.revoked_by}`);
            }
            return revoked;
        }
        catch (error) {
            logger_1.default.error('Error revoking session:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Revoke all sessions for a user except the current one
     */
    async revokeAllForUser(userId, exceptSessionId, revokedBy = 'user') {
        const client = await this.pool.connect();
        try {
            let query = `
        UPDATE sessions 
        SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP, revoked_by = $2
        WHERE user_id = $1 AND is_revoked = FALSE
      `;
            const values = [userId, revokedBy];
            if (exceptSessionId) {
                query += ` AND id != $3`;
                values.push(exceptSessionId);
            }
            const result = await client.query(query, values);
            const revokedCount = result.rowCount || 0;
            logger_1.default.info(`Revoked ${revokedCount} sessions for user ${userId}`);
            return revokedCount;
        }
        catch (error) {
            logger_1.default.error('Error revoking all sessions for user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Clean up expired sessions
     */
    async cleanupExpired() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT cleanup_expired_sessions()');
            const deletedCount = result.rows[0].cleanup_expired_sessions;
            logger_1.default.info(`Cleaned up ${deletedCount} expired sessions`);
            return deletedCount;
        }
        catch (error) {
            logger_1.default.error('Error cleaning up expired sessions:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get session statistics for a user
     */
    async getStatsForUser(userId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_sessions,
          COUNT(CASE WHEN is_revoked = TRUE THEN 1 END) as revoked_sessions,
          COUNT(CASE WHEN is_revoked = FALSE AND expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_sessions,
          COUNT(DISTINCT device_type) as unique_devices,
          COUNT(DISTINCT location) as unique_locations
        FROM sessions 
        WHERE user_id = $1
      `;
            const result = await client.query(query, [userId]);
            const stats = result.rows[0];
            return {
                total_sessions: parseInt(stats.total_sessions),
                active_sessions: parseInt(stats.active_sessions),
                revoked_sessions: parseInt(stats.revoked_sessions),
                expired_sessions: parseInt(stats.expired_sessions),
                unique_devices: parseInt(stats.unique_devices),
                unique_locations: parseInt(stats.unique_locations)
            };
        }
        catch (error) {
            logger_1.default.error('Error getting session stats for user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Check if there are suspicious sessions (same user, different country within short time)
     */
    async findSuspiciousSessions(userId, timeWindowHours = 24) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM sessions 
        WHERE user_id = $1 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${timeWindowHours} hours'
        AND country_code IS NOT NULL
        AND is_revoked = FALSE
        ORDER BY created_at DESC
      `;
            const result = await client.query(query, [userId]);
            const sessions = result.rows;
            // Check for different countries in the time window
            const countries = new Set(sessions.map(s => s.country_code));
            if (countries.size > 1) {
                return sessions;
            }
            return [];
        }
        catch (error) {
            logger_1.default.error('Error finding suspicious sessions:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete old revoked sessions (cleanup)
     */
    async deleteOldRevokedSessions(daysOld = 30) {
        const client = await this.pool.connect();
        try {
            const query = `
        DELETE FROM sessions 
        WHERE is_revoked = TRUE 
        AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
      `;
            const result = await client.query(query);
            const deletedCount = result.rowCount || 0;
            logger_1.default.info(`Deleted ${deletedCount} old revoked sessions`);
            return deletedCount;
        }
        catch (error) {
            logger_1.default.error('Error deleting old revoked sessions:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.SessionRepository = SessionRepository;
