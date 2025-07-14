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

  // Convert User to UserResponse (removes sensitive fields)
  toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture_url: user.profile_picture_url,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  }
} 