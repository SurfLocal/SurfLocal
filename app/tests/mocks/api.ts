/**
 * API Mock
 * Provides mock implementations for API calls
 */

import { vi } from 'vitest';

export const mockApiResponse = <T>(data: T) => Promise.resolve(data);
export const mockApiError = (status: number, message: string) => 
  Promise.reject({ statusCode: status, message });

// Mock API client
export const createMockApi = () => ({
  auth: {
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getCurrentUser: vi.fn(),
    changePassword: vi.fn(),
    resetPassword: vi.fn(),
    confirmReset: vi.fn(),
    checkAdmin: vi.fn()
  },
  sessions: {
    getPublic: vi.fn(),
    getById: vi.fn(),
    getByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getUserMedia: vi.fn()
  },
  profiles: {
    getByUserId: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    search: vi.fn()
  },
  boards: {
    getByUser: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  social: {
    like: vi.fn(),
    unlike: vi.fn(),
    kook: vi.fn(),
    unkook: vi.fn(),
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
    getFollowStats: vi.fn()
  },
  spots: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn()
  },
  forecast: {
    getComments: vi.fn(),
    addComment: vi.fn(),
    deleteComment: vi.fn(),
    likeComment: vi.fn(),
    unlikeComment: vi.fn()
  }
});

// Default mock API instance
export const mockApi = createMockApi();

// Helper to reset all API mocks
export const resetApiMocks = () => {
  Object.values(mockApi).forEach(namespace => {
    Object.values(namespace).forEach(fn => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as ReturnType<typeof vi.fn>).mockReset();
      }
    });
  });
};
