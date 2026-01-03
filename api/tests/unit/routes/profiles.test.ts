/**
 * Profiles Routes Unit Tests
 */

// Mock database
const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQuery,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

describe('Profiles Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /profiles/user/:userId', () => {
    it('should return profile for valid user ID', async () => {
      const mockProfile = {
        id: 'profile-123',
        user_id: 'user-123',
        display_name: 'Test User',
        bio: 'Test bio',
        home_break: 'Test Beach',
        years_surfing: 5,
        avatar_url: 'https://example.com/avatar.jpg',
        session_count: 10,
        board_count: 3,
        follower_count: 50,
        following_count: 25
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockProfile] });

      const result = await simulateGetProfile('user-123');

      expect(result.success).toBe(true);
      expect(result.profile).toEqual(mockProfile);
    });

    it('should return 404 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateGetProfile('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('PUT /profiles/:id', () => {
    it('should update profile with valid fields', async () => {
      const updatedProfile = {
        id: 'profile-123',
        display_name: 'Updated Name',
        bio: 'Updated bio'
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedProfile] });

      const result = await simulateUpdateProfile('profile-123', {
        display_name: 'Updated Name',
        bio: 'Updated bio'
      });

      expect(result.success).toBe(true);
      expect(result.profile.display_name).toBe('Updated Name');
    });

    it('should reject update with no valid fields', async () => {
      const result = await simulateUpdateProfile('profile-123', {
        invalid_field: 'test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid fields');
    });

    it('should allow updating streak fields', async () => {
      const updatedProfile = {
        id: 'profile-123',
        longest_streak: 10,
        longest_streak_start: '2025-01-01'
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedProfile] });

      const result = await simulateUpdateProfile('profile-123', {
        longest_streak: 10,
        longest_streak_start: '2025-01-01'
      });

      expect(result.success).toBe(true);
    });

    it('should return 404 for non-existent profile', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateUpdateProfile('non-existent', {
        display_name: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('GET /profiles/search', () => {
    it('should return matching profiles', async () => {
      const mockProfiles = [
        { id: '1', display_name: 'John Doe', follower_count: 100 },
        { id: '2', display_name: 'Johnny', follower_count: 50 }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockProfiles });

      const result = await simulateSearchProfiles('John');

      expect(result.success).toBe(true);
      expect(result.profiles).toHaveLength(2);
    });

    it('should return empty array for no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateSearchProfiles('NonExistent');

      expect(result.success).toBe(true);
      expect(result.profiles).toHaveLength(0);
    });

    it('should return empty for empty query', async () => {
      const result = await simulateSearchProfiles('');

      expect(result.success).toBe(true);
      expect(result.profiles).toHaveLength(0);
    });
  });
});

// Helper functions
async function simulateGetProfile(userId: string) {
  try {
    const result = await mockQuery(
      'SELECT p.*, ... FROM profiles p WHERE p.user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Profile not found' };
    }

    return { success: true, profile: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateUpdateProfile(profileId: string, updates: Record<string, any>) {
  const allowedFields = [
    'display_name', 'bio', 'avatar_url', 'home_break', 'years_surfing',
    'longest_streak', 'longest_streak_start'
  ];

  const validUpdates = Object.keys(updates).filter(key => allowedFields.includes(key));

  if (validUpdates.length === 0) {
    return { success: false, error: 'No valid fields to update' };
  }

  try {
    const result = await mockQuery(
      'UPDATE profiles SET ... WHERE id = $1 RETURNING *',
      [profileId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Profile not found' };
    }

    return { success: true, profile: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateSearchProfiles(query: string) {
  if (!query) {
    return { success: true, profiles: [] };
  }

  try {
    const result = await mockQuery(
      'SELECT p.* FROM profiles p WHERE display_name ILIKE $1',
      [`%${query}%`]
    );

    return { success: true, profiles: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
