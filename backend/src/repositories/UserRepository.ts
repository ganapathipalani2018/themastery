import { Pool } from 'pg';
import { User, CreateUserRequest, UserResponse } from '../models/User';
import pool from '../db';

export class UserRepository {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  async createUser(userData: CreateUserRequest & { password_hash: string }): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.password_hash,
      userData.first_name,
      userData.last_name
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof User]);
    
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async verifyUser(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_verified = true, verification_token = NULL
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async verifyUserByToken(token: string): Promise<User | null> {
    const findQuery = 'SELECT * FROM users WHERE verification_token = $1';
    const findResult = await this.db.query(findQuery, [token]);
    const user = findResult.rows[0];
    
    if (!user) {
      return null;
    }

    const updateQuery = `
      UPDATE users 
      SET is_verified = true, verification_token = NULL
      WHERE verification_token = $1
      RETURNING *
    `;
    
    const updateResult = await this.db.query(updateQuery, [token]);
    return updateResult.rows[0] || null;
  }

  async setResetPasswordToken(email: string, token: string, expires: Date): Promise<boolean> {
    const query = `
      UPDATE users 
      SET reset_password_token = $1, reset_password_expires = $2
      WHERE email = $3
      RETURNING id
    `;
    
    const result = await this.db.query(query, [token, expires, email]);
    return (result.rowCount || 0) > 0;
  }

  async findByResetToken(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE reset_password_token = $1 AND reset_password_expires > NOW()
    `;
    
    const result = await this.db.query(query, [token]);
    return result.rows[0] || null;
  }

  async resetPassword(token: string, newPasswordHash: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL
      WHERE reset_password_token = $2 AND reset_password_expires > NOW()
      RETURNING id
    `;
    
    const result = await this.db.query(query, [newPasswordHash, token]);
    return (result.rowCount || 0) > 0;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await this.db.query(query, [googleId]);
    return result.rows[0] || null;
  }

  async createOAuthUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    google_id: string;
    profile_picture_url?: string;
    google_refresh_token?: string;
  }): Promise<User> {
    const query = `
      INSERT INTO users (email, first_name, last_name, google_id, profile_picture_url, google_refresh_token, is_verified, account_status, subscription_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.first_name,
      userData.last_name,
      userData.google_id,
      userData.profile_picture_url || null,
      userData.google_refresh_token || null,
      true, // OAuth users are automatically verified
      'active',
      'free'
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async linkGoogleAccount(userId: string, googleId: string, refreshToken?: string): Promise<User | null> {
    const query = `
      UPDATE users 
      SET google_id = $1, google_refresh_token = $2, is_verified = true
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await this.db.query(query, [googleId, refreshToken || null, userId]);
    return result.rows[0] || null;
  }

  async updateLastLogin(id: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await this.db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async updateGoogleRefreshToken(id: string, refreshToken: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET google_refresh_token = $1
      WHERE id = $2
      RETURNING id
    `;
    
    const result = await this.db.query(query, [refreshToken, id]);
    return (result.rowCount || 0) > 0;
  }

  // Convert User to UserResponse (removes sensitive fields)
  toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture_url: user.profile_picture_url,
      is_verified: user.is_verified,
      google_id: user.google_id,
      last_login: user.last_login,
      account_status: user.account_status,
      subscription_status: user.subscription_status,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }
} 