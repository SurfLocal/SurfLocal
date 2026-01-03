/**
 * Auth Middleware Tests
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuth, AuthRequest } from '../../../src/middleware/auth';

const TEST_SECRET = 'test-secret-key';
const TEST_USER_ID = 'user-123';

// Mock JWT_SECRET environment variable
process.env.JWT_SECRET = TEST_SECRET;

describe('authenticate middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should throw error when no authorization header is provided', () => {
    expect(() => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    }).toThrow('No token provided');
  });

  it('should throw error when authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'Basic token123' };
    
    expect(() => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    }).toThrow('No token provided');
  });

  it('should throw error for invalid token', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    
    expect(() => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    }).toThrow('Invalid or expired token');
  });

  it('should set userId and call next for valid token', () => {
    const validToken = jwt.sign({ userId: TEST_USER_ID }, TEST_SECRET);
    mockRequest.headers = { authorization: `Bearer ${validToken}` };
    
    authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    
    expect(mockRequest.userId).toBe(TEST_USER_ID);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw error for expired token', () => {
    const expiredToken = jwt.sign({ userId: TEST_USER_ID }, TEST_SECRET, { expiresIn: '-1h' });
    mockRequest.headers = { authorization: `Bearer ${expiredToken}` };
    
    expect(() => {
      authenticate(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    }).toThrow('Invalid or expired token');
  });
});

describe('optionalAuth middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should call next without setting userId when no token provided', () => {
    optionalAuth(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    
    expect(mockRequest.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set userId for valid token', () => {
    const validToken = jwt.sign({ userId: TEST_USER_ID }, TEST_SECRET);
    mockRequest.headers = { authorization: `Bearer ${validToken}` };
    
    optionalAuth(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    
    expect(mockRequest.userId).toBe(TEST_USER_ID);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next without userId for invalid token', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    
    optionalAuth(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    
    expect(mockRequest.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next without userId for malformed authorization header', () => {
    mockRequest.headers = { authorization: 'NotBearer token' };
    
    optionalAuth(mockRequest as AuthRequest, mockResponse as Response, mockNext);
    
    expect(mockRequest.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });
});
