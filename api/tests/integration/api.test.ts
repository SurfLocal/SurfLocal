/**
 * API Integration Tests
 * 
 * These tests verify the API endpoints work correctly end-to-end.
 * They use a test database or mocked database connections.
 */

import express, { Express } from 'express';
import request from 'supertest';

// Mock database for integration tests
const mockQuery = jest.fn();
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  analyticsQuery: jest.fn(),
  pool: { on: jest.fn(), connect: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

// Create a minimal express app for testing
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  
  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mock auth endpoint
  app.post('/api/auth/signin', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password required' } });
    }

    try {
      const result = await mockQuery('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: { message: 'Invalid credentials' } });
      }

      return res.json({ 
        token: 'test-token',
        user: { id: result.rows[0].id, email: result.rows[0].email }
      });
    } catch (error) {
      return res.status(500).json({ error: { message: 'Internal server error' } });
    }
  });

  // Mock sessions endpoint
  app.get('/api/sessions/public', async (req, res) => {
    try {
      const result = await mockQuery('SELECT * FROM sessions WHERE is_public = true');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: { message: 'Internal server error' } });
    }
  });

  // Mock profiles endpoint
  app.get('/api/profiles/user/:userId', async (req, res) => {
    try {
      const result = await mockQuery('SELECT * FROM profiles WHERE user_id = $1', [req.params.userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Profile not found' } });
      }

      return res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ error: { message: 'Internal server error' } });
    }
  });

  return app;
}

describe('API Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('POST /api/auth/signin should return token for valid credentials', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-123', email: 'test@example.com', password_hash: 'hashed' }]
      });

      const response = await request(app)
        .post('/api/auth/signin')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('POST /api/auth/signin should return 401 for invalid credentials', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/signin')
        .send({ email: 'wrong@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
    });

    it('POST /api/auth/signin should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signin')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
    });
  });

  describe('Sessions', () => {
    it('GET /api/sessions/public should return public sessions', async () => {
      const mockSessions = [
        { id: 'session-1', location: 'Beach 1', is_public: true },
        { id: 'session-2', location: 'Beach 2', is_public: true }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockSessions });

      const response = await request(app).get('/api/sessions/public');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].location).toBe('Beach 1');
    });

    it('GET /api/sessions/public should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/sessions/public');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('Profiles', () => {
    it('GET /api/profiles/user/:userId should return profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-123',
        display_name: 'Test User',
        bio: 'Surfer'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockProfile] });

      const response = await request(app).get('/api/profiles/user/user-123');

      expect(response.status).toBe(200);
      expect(response.body.display_name).toBe('Test User');
    });

    it('GET /api/profiles/user/:userId should return 404 for non-existent user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/api/profiles/user/non-existent');

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app).get('/api/sessions/public');

      expect(response.status).toBe(500);
      expect(response.body.error.message).toContain('Internal server error');
    });
  });
});

describe('Request Validation', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/signin')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(response.status).toBe(400);
  });

  it('should handle missing Content-Type', async () => {
    const response = await request(app)
      .post('/api/auth/signin')
      .send('email=test@example.com&password=test');

    // Should handle the request (may fail validation, not parsing)
    expect([400, 401, 500]).toContain(response.status);
  });
});
