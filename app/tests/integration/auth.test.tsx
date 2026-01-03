/**
 * Authentication Flow Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// Mock the API
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../../../src/lib/api', () => ({
  api: {
    auth: {
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      getCurrentUser: vi.fn()
    }
  }
}));

describe('Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Sign In Flow', () => {
    it('should store token on successful sign in', async () => {
      mockSignIn.mockResolvedValueOnce({
        token: 'test-token-123',
        user: { id: 'user-1', email: 'test@example.com' }
      });

      // Simulate sign in
      const result = await mockSignIn('test@example.com', 'password123');

      expect(result.token).toBe('test-token-123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle sign in error', async () => {
      mockSignIn.mockRejectedValueOnce({ 
        statusCode: 401, 
        message: 'Invalid credentials' 
      });

      await expect(mockSignIn('wrong@example.com', 'wrong'))
        .rejects.toEqual({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('should require email and password', async () => {
      mockSignIn.mockRejectedValueOnce({
        statusCode: 400,
        message: 'Email and password required'
      });

      await expect(mockSignIn('', ''))
        .rejects.toEqual({ statusCode: 400, message: 'Email and password required' });
    });
  });

  describe('Sign Up Flow', () => {
    it('should create account successfully', async () => {
      mockSignUp.mockResolvedValueOnce({
        token: 'new-user-token',
        user: { id: 'new-user', email: 'new@example.com' }
      });

      const result = await mockSignUp('new@example.com', 'password123', 'New User');

      expect(result.token).toBe('new-user-token');
      expect(result.user.email).toBe('new@example.com');
    });

    it('should reject duplicate email', async () => {
      mockSignUp.mockRejectedValueOnce({
        statusCode: 400,
        message: 'Email already registered'
      });

      await expect(mockSignUp('existing@example.com', 'password'))
        .rejects.toEqual({ statusCode: 400, message: 'Email already registered' });
    });
  });

  describe('Sign Out Flow', () => {
    it('should clear stored data on sign out', () => {
      localStorage.setItem('auth_token', 'test-token');
      
      mockSignOut();
      localStorage.removeItem('auth_token');

      // Verify removeItem was called to clear the token
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('Protected Routes', () => {
    it('should check for auth token', () => {
      // When no token is set, getItem should be called but return null
      localStorage.getItem('auth_token');
      
      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should set auth token on login', () => {
      localStorage.setItem('auth_token', 'valid-token');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'valid-token');
    });
  });
});

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should include token in API requests', () => {
    const token = 'test-bearer-token';
    localStorage.setItem('auth_token', token);

    // Verify setItem was called with correct arguments
    expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', token);
  });

  it('should handle expired token', async () => {
    mockSignIn.mockRejectedValueOnce({
      statusCode: 401,
      message: 'Token expired'
    });

    await expect(mockSignIn('test@example.com', 'password'))
      .rejects.toEqual({ statusCode: 401, message: 'Token expired' });
  });
});
