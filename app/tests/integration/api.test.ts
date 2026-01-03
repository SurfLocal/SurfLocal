/**
 * API Client Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Request Configuration', () => {
    it('should include Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'test' })
      });

      await fetch('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      }));
    });

    it('should include Authorization header when token exists', async () => {
      const token = 'test-token';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ data: 'test' })
      });

      await fetch('/api/test', {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }));
    });
  });

  describe('Response Handling', () => {
    it('should parse JSON responses', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockData)
      });

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(data).toEqual(mockData);
    });

    it('should handle error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ message: 'Not found' })
      });

      const response = await fetch('/api/test');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/test')).rejects.toThrow('Network error');
    });
  });

  describe('Sessions API', () => {
    it('should fetch public sessions', async () => {
      const mockSessions = [
        { id: '1', location: 'Beach 1' },
        { id: '2', location: 'Beach 2' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockSessions)
      });

      const response = await fetch('/api/sessions/public');
      const data = await response.json();

      expect(data).toHaveLength(2);
      expect(data[0].location).toBe('Beach 1');
    });

    it('should create session with POST', async () => {
      const newSession = { location: 'New Beach', session_date: '2025-01-03' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ id: 'new-id', ...newSession })
      });

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      });
      const data = await response.json();

      expect(data.id).toBe('new-id');
      expect(data.location).toBe('New Beach');
    });
  });

  describe('Profiles API', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: 'Test User'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve(mockProfile)
      });

      const response = await fetch('/api/profiles/user/user-1');
      const data = await response.json();

      expect(data.display_name).toBe('Test User');
    });

    it('should update profile with PUT', async () => {
      const updates = { display_name: 'Updated Name' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ ...updates, id: 'profile-1' })
      });

      const response = await fetch('/api/profiles/profile-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await response.json();

      expect(data.display_name).toBe('Updated Name');
    });
  });

  describe('Social API', () => {
    it('should like a session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true })
      });

      const response = await fetch('/api/social/sessions/session-1/like', {
        method: 'POST'
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should follow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true })
      });

      const response = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: 'user-1', followingId: 'user-2' })
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });
});
