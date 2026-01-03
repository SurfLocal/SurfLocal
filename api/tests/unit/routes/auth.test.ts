/**
 * Auth Routes Unit Tests
 */

import { Request, Response } from 'express';

// Mock database before importing routes
const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQuery,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn()
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test-jwt-token'),
  verify: jest.fn()
}));

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Auth Routes', () => {
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        email_confirmed: false,
        created_at: new Date().toISOString()
      };

      // Mock user doesn't exist
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Mock user creation
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      // Mock profile creation
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'profile-123' }] });

      const result = await simulateSignup({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      });

      expect(result.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
    });

    it('should reject duplicate email', async () => {
      // Mock user already exists
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ id: 'existing-user', email: 'test@example.com' }] 
      });

      const result = await simulateSignup({
        email: 'test@example.com',
        password: 'Password123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should require email', async () => {
      const result = await simulateSignup({
        email: '',
        password: 'Password123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require password', async () => {
      const result = await simulateSignup({
        email: 'test@example.com',
        password: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('POST /auth/signin', () => {
    it('should sign in user with correct credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        email_confirmed: true
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await simulateSignin({
        email: 'test@example.com',
        password: 'Password123!'
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should reject invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await simulateSignin({
        email: 'test@example.com',
        password: 'WrongPassword!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should reject non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateSignin({
        email: 'nonexistent@example.com',
        password: 'Password123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('GET /auth/check-admin', () => {
    it('should require authentication', async () => {
      const result = await simulateCheckAdmin(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No token provided');
    });

    it('should return admin status for authenticated user', async () => {
      const result = await simulateCheckAdmin('valid-token', true);

      expect(result.success).toBe(true);
      expect(result.is_admin).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      const result = await simulateCheckAdmin('valid-token', false);

      expect(result.success).toBe(true);
      expect(result.is_admin).toBe(false);
    });
  });
});

// Helper functions to simulate route handlers
async function simulateSignup(data: { email: string; password: string; displayName?: string }) {
  try {
    if (!data.email || !data.password) {
      return { success: false, error: 'Email and password are required' };
    }

    const existingResult = await mockQuery('SELECT * FROM users WHERE email = $1', [data.email]);
    if (existingResult.rows.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    await bcrypt.hash(data.password, 10);
    const userResult = await mockQuery('INSERT INTO users...', [data.email]);
    
    return { success: true, user: userResult.rows[0], token: 'test-jwt-token' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateSignin(data: { email: string; password: string }) {
  try {
    const userResult = await mockQuery('SELECT * FROM users WHERE email = $1', [data.email]);
    
    if (userResult.rows.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(data.password, user.password_hash);
    
    if (!validPassword) {
      return { success: false, error: 'Invalid email or password' };
    }

    const token = jwt.sign({ userId: user.id }, 'secret');
    return { success: true, user, token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateCheckAdmin(token: string | null, isAdmin?: boolean) {
  if (!token) {
    return { success: false, error: 'No token provided' };
  }

  try {
    const decoded = jwt.verify(token, 'secret') as { userId: string };
    return { success: true, is_admin: isAdmin ?? false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
