/**
 * Auth Context Mock
 * Provides mock implementations for authentication context
 */

import { vi } from 'vitest';
import React from 'react';

export const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: null,
  email_confirmed: true,
  created_at: '2025-01-01T00:00:00Z'
};

export const createMockAuthContext = (overrides: Partial<{
  user: typeof TEST_USER | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signUp: () => Promise<void>;
  signOut: () => void;
  updateUser: () => void;
}> = {}) => ({
  user: TEST_USER,
  loading: false,
  signIn: vi.fn().mockResolvedValue(undefined),
  signUp: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  ...overrides
});

// Mock AuthProvider wrapper for testing
export const MockAuthProvider: React.FC<{ 
  children: React.ReactNode;
  value?: ReturnType<typeof createMockAuthContext>;
}> = ({ children, value }) => {
  const AuthContext = React.createContext(value || createMockAuthContext());
  return React.createElement(AuthContext.Provider, { value: value || createMockAuthContext() }, children);
};
