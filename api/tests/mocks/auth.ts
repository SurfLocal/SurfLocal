/**
 * Auth Mock
 * Provides mock implementations for authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const TEST_USER_ID = 'test-user-id-123';
export const TEST_USER_EMAIL = 'test@example.com';
export const TEST_JWT_SECRET = 'test-secret-key';

export const createTestToken = (userId: string = TEST_USER_ID): string => {
  return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: '1h' });
};

export const mockAuthRequest = (userId: string = TEST_USER_ID) => ({
  userId,
  headers: {
    authorization: `Bearer ${createTestToken(userId)}`
  },
  body: {},
  params: {},
  query: {}
});

export const mockAuthenticate = (req: any, res: Response, next: NextFunction) => {
  req.userId = TEST_USER_ID;
  next();
};

export const mockOptionalAuth = (req: any, res: Response, next: NextFunction) => {
  // Don't set userId for optional auth by default
  next();
};

// Helper to create authenticated request
export const createAuthenticatedRequest = (overrides: Partial<Request> = {}) => ({
  ...mockAuthRequest(),
  ...overrides
});
