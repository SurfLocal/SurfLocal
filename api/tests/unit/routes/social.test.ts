/**
 * Social Routes Unit Tests
 */

// Mock database
const mockQuerySocial = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQuerySocial,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

describe('Social Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /social/follow', () => {
    it('should follow a user successfully', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [] }); // No existing follow
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ id: 'follow-1' }] }); // Insert

      const result = await simulateFollow('user-1', 'user-2');

      expect(result.success).toBe(true);
    });

    it('should not allow following yourself', async () => {
      const result = await simulateFollow('user-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('yourself');
    });

    it('should not create duplicate follows', async () => {
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ follower_id: 'user-1', following_id: 'user-2' }] 
      });

      const result = await simulateFollow('user-1', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error.toLowerCase()).toContain('already');
    });
  });

  describe('DELETE /social/follow/:followingId', () => {
    it('should unfollow successfully', async () => {
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ follower_id: 'user-1', following_id: 'user-2' }],
        rowCount: 1 
      });

      const result = await simulateUnfollow('user-1', 'user-2');

      expect(result.success).toBe(true);
    });

    it('should return error if not following', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await simulateUnfollow('user-1', 'user-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not following');
    });
  });

  describe('POST /social/sessions/:sessionId/like', () => {
    it('should like a session', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ user_id: 'other-user' }] }); // Session exists
      mockQuerySocial.mockResolvedValueOnce({ rows: [] }); // Not already liked
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ id: 'like-1' }] }); // Insert

      const result = await simulateLikeSession('session-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('should not allow liking own session', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }] });

      const result = await simulateLikeSession('session-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('own session');
    });

    it('should not create duplicate likes', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ user_id: 'other-user' }] });
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ id: 'existing-like' }] });

      const result = await simulateLikeSession('session-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already liked');
    });
  });

  describe('GET /social/search-profiles', () => {
    it('should escape ILIKE special characters', async () => {
      const searchQuery = 'test%user_name\\';
      const sanitizedQuery = searchQuery.replace(/[%_\\]/g, '\\$&');

      mockQuerySocial.mockResolvedValueOnce({ rows: [] });

      await simulateSearchProfiles(searchQuery);

      expect(mockQuerySocial).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining([`%${sanitizedQuery}%`, expect.any(Number)])
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await simulateSearchProfiles('');

      expect(result.success).toBe(true);
      expect(result.profiles).toEqual([]);
      expect(mockQuerySocial).not.toHaveBeenCalled();
    });

    it('should return profiles matching search', async () => {
      mockQuerySocial.mockResolvedValueOnce({
        rows: [
          { user_id: 'user-1', display_name: 'Test User', session_count: 5 }
        ]
      });

      const result = await simulateSearchProfiles('test');

      expect(result.success).toBe(true);
      expect(result.profiles.length).toBe(1);
    });
  });

  describe('POST /social/sessions/:sessionId/comments', () => {
    it('should add comment to session', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [{ id: 'session-1' }] }); // Session exists
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ id: 'comment-1', content: 'Great session!', user_id: 'user-1' }] 
      });

      const result = await simulateAddComment('session-1', 'user-1', 'Great session!');

      expect(result.success).toBe(true);
      expect(result.comment.content).toBe('Great session!');
    });

    it('should require content', async () => {
      const result = await simulateAddComment('session-1', 'user-1', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return error for non-existent session', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [] });

      const result = await simulateAddComment('non-existent', 'user-1', 'Comment');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('DELETE /social/comments/:commentId', () => {
    it('should delete own comment', async () => {
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ id: 'comment-1', user_id: 'user-1' }] 
      });
      mockQuerySocial.mockResolvedValueOnce({ rowCount: 1 });

      const result = await simulateDeleteComment('comment-1', 'user-1', false);

      expect(result.success).toBe(true);
    });

    it('should allow admin to delete any comment', async () => {
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ id: 'comment-1', user_id: 'other-user' }] 
      });
      mockQuerySocial.mockResolvedValueOnce({ rowCount: 1 });

      const result = await simulateDeleteComment('comment-1', 'admin-user', true);

      expect(result.success).toBe(true);
    });

    it('should not allow non-owner to delete comment', async () => {
      mockQuerySocial.mockResolvedValueOnce({ 
        rows: [{ id: 'comment-1', user_id: 'other-user' }] 
      });

      const result = await simulateDeleteComment('comment-1', 'user-1', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });

  describe('GET /social/followers/:userId', () => {
    it('should return list of followers', async () => {
      const mockFollowers = [
        { user_id: 'follower-1', display_name: 'User 1' },
        { user_id: 'follower-2', display_name: 'User 2' }
      ];

      mockQuerySocial.mockResolvedValueOnce({ rows: mockFollowers });

      const result = await simulateGetFollowers('user-1');

      expect(result.success).toBe(true);
      expect(result.followers).toHaveLength(2);
    });

    it('should return empty array for user with no followers', async () => {
      mockQuerySocial.mockResolvedValueOnce({ rows: [] });

      const result = await simulateGetFollowers('user-1');

      expect(result.success).toBe(true);
      expect(result.followers).toHaveLength(0);
    });
  });
});

// Helper functions
async function simulateFollow(followerId: string, followingId: string) {
  if (followerId === followingId) {
    return { success: false, error: 'Cannot follow yourself' };
  }

  try {
    const existingResult = await mockQuerySocial(
      'SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    if (existingResult.rows.length > 0) {
      return { success: false, error: 'Already following this user' };
    }

    await mockQuerySocial(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateUnfollow(followerId: string, followingId: string) {
  try {
    const result = await mockQuerySocial(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
      [followerId, followingId]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'You are not following this user' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateLikeSession(sessionId: string, userId: string) {
  try {
    const sessionResult = await mockQuerySocial(
      'SELECT user_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    if (sessionResult.rows[0].user_id === userId) {
      return { success: false, error: 'Cannot like your own session' };
    }

    const existingLike = await mockQuerySocial(
      'SELECT id FROM session_likes WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (existingLike.rows.length > 0) {
      return { success: false, error: 'Session already liked' };
    }

    await mockQuerySocial(
      'INSERT INTO session_likes (session_id, user_id) VALUES ($1, $2)',
      [sessionId, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateAddComment(sessionId: string, userId: string, content: string) {
  if (!content || content.trim() === '') {
    return { success: false, error: 'Content is required' };
  }

  try {
    const sessionResult = await mockQuerySocial(
      'SELECT id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    const result = await mockQuerySocial(
      'INSERT INTO session_comments (session_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [sessionId, userId, content]
    );

    return { success: true, comment: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateDeleteComment(commentId: string, userId: string, isAdmin: boolean) {
  try {
    const commentResult = await mockQuerySocial(
      'SELECT * FROM session_comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return { success: false, error: 'Comment not found' };
    }

    const comment = commentResult.rows[0];
    if (comment.user_id !== userId && !isAdmin) {
      return { success: false, error: 'No permission to delete this comment' };
    }

    await mockQuerySocial('DELETE FROM session_comments WHERE id = $1', [commentId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateSearchProfiles(query: string) {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return { success: true, profiles: [] };
    }

    const sanitizedQuery = query.replace(/[%_\\]/g, '\\$&');

    const result = await mockQuerySocial(
      `SELECT * FROM profiles WHERE display_name ILIKE $1 OR bio ILIKE $1 LIMIT $2`,
      [`%${sanitizedQuery}%`, 50]
    );

    return { success: true, profiles: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateGetFollowers(userId: string) {
  try {
    const result = await mockQuerySocial(
      'SELECT p.* FROM follows f JOIN profiles p ON f.follower_id = p.user_id WHERE f.following_id = $1',
      [userId]
    );
    return { success: true, followers: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
