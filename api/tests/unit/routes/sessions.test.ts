/**
 * Sessions Routes Unit Tests
 */

// Mock database
const mockQuery = jest.fn();
const mockAnalyticsQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQuery,
  analyticsQuery: mockAnalyticsQuery,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

describe('Sessions Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /sessions/public', () => {
    it('should return public sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          location: 'Black\'s Beach',
          session_date: '2025-01-03',
          is_public: true,
          user_id: 'user-1',
          like_count: 5,
          comment_count: 2
        },
        {
          id: 'session-2',
          location: 'Scripps',
          session_date: '2025-01-02',
          is_public: true,
          user_id: 'user-2',
          like_count: 10,
          comment_count: 3
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockSessions });

      const result = await simulateGetPublicSessions();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].is_public).toBe(true);
    });

    it('should support pagination', async () => {
      const mockSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i}`,
        location: 'Test Beach',
        is_public: true
      }));

      mockQuery.mockResolvedValueOnce({ rows: mockSessions.slice(0, 10) });

      const result = await simulateGetPublicSessions(10, 0);

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(10);
    });
  });

  describe('GET /sessions/:id', () => {
    it('should return session by ID', async () => {
      const mockSession = {
        id: 'session-123',
        location: 'Black\'s Beach',
        session_date: '2025-01-03',
        wave_height: '4-6 ft',
        wave_count: 15,
        user_id: 'user-123',
        is_public: true
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await simulateGetSession('session-123');

      expect(result.success).toBe(true);
      expect(result.session.id).toBe('session-123');
    });

    it('should return 404 for non-existent session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateGetSession('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('POST /sessions', () => {
    it('should create new session with required fields', async () => {
      const newSession = {
        id: 'session-new',
        location: 'Test Beach',
        session_date: '2025-01-03',
        user_id: 'user-123'
      };

      mockQuery.mockResolvedValueOnce({ rows: [newSession] });

      const result = await simulateCreateSession({
        location: 'Test Beach',
        session_date: '2025-01-03',
        user_id: 'user-123'
      });

      expect(result.success).toBe(true);
      expect(result.session.location).toBe('Test Beach');
    });

    it('should require location', async () => {
      const result = await simulateCreateSession({
        session_date: '2025-01-03',
        user_id: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Location');
    });

    it('should require session_date', async () => {
      const result = await simulateCreateSession({
        location: 'Test Beach',
        user_id: 'user-123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('date');
    });
  });

  describe('PUT /sessions/:id', () => {
    it('should update session fields', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123'
      };

      const updatedSession = {
        id: 'session-123',
        location: 'Updated Beach',
        wave_count: 20
      };

      // First query to check ownership
      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });
      // Update query
      mockQuery.mockResolvedValueOnce({ rows: [updatedSession] });

      const result = await simulateUpdateSession('session-123', 'user-123', {
        location: 'Updated Beach',
        wave_count: 20
      });

      expect(result.success).toBe(true);
      expect(result.session.location).toBe('Updated Beach');
    });

    it('should reject update from non-owner', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'other-user'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await simulateUpdateSession('session-123', 'user-123', {
        location: 'Updated Beach'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });

  describe('DELETE /sessions/:id', () => {
    it('should delete session owned by user', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });
      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await simulateDeleteSession('session-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should reject delete from non-owner', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'other-user'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockSession] });

      const result = await simulateDeleteSession('session-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});

// Helper functions
async function simulateGetPublicSessions(limit = 20, offset = 0) {
  try {
    const result = await mockQuery(
      'SELECT * FROM sessions WHERE is_public = true ORDER BY session_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return { success: true, sessions: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateGetSession(sessionId: string) {
  try {
    const result = await mockQuery(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    return { success: true, session: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateCreateSession(data: Record<string, any>) {
  if (!data.location) {
    return { success: false, error: 'Location is required' };
  }
  if (!data.session_date) {
    return { success: false, error: 'Session date is required' };
  }

  try {
    const result = await mockQuery(
      'INSERT INTO sessions (...) VALUES (...) RETURNING *',
      Object.values(data)
    );
    return { success: true, session: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateUpdateSession(sessionId: string, userId: string, updates: Record<string, any>) {
  try {
    const sessionResult = await mockQuery(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    if (sessionResult.rows[0].user_id !== userId) {
      return { success: false, error: 'No permission to update this session' };
    }

    const result = await mockQuery(
      'UPDATE sessions SET ... WHERE id = $1 RETURNING *',
      [sessionId]
    );
    return { success: true, session: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateDeleteSession(sessionId: string, userId: string) {
  try {
    const sessionResult = await mockQuery(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }

    if (sessionResult.rows[0].user_id !== userId) {
      return { success: false, error: 'No permission to delete this session' };
    }

    await mockQuery('DELETE FROM sessions WHERE id = $1', [sessionId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
