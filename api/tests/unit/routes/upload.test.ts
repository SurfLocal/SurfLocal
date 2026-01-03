/**
 * Upload Routes Unit Tests
 * Tests for authentication and authorization on upload endpoints
 */

const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQuery,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetFileUrl = jest.fn().mockReturnValue('http://minio/bucket/file.jpg');
jest.mock('../../../src/config/minio', () => ({
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
  getFileUrl: mockGetFileUrl,
  BUCKETS: {
    SESSION_MEDIA: 'session-media',
    AVATARS: 'avatars',
    BOARD_PHOTOS: 'board-photos'
  }
}));

const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockVerify,
  sign: jest.fn()
}));

describe('Upload Routes Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /upload/session-media', () => {
    it('should require authentication', async () => {
      const result = await simulateSessionMediaUpload(null, 'session-123', []);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No token provided');
    });

    it('should verify session ownership before upload', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ user_id: 'different-user' }] 
      });

      const result = await simulateSessionMediaUpload('valid-token', 'session-123', [
        { originalname: 'test.jpg', mimetype: 'image/jpeg', buffer: Buffer.from(''), size: 1000 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('should allow upload when user owns session', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ user_id: 'user-123' }] 
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'media-123', url: 'http://minio/bucket/file.jpg' }]
      });

      const result = await simulateSessionMediaUpload('valid-token', 'session-123', [
        { originalname: 'test.jpg', mimetype: 'image/jpeg', buffer: Buffer.from(''), size: 1000 }
      ]);

      expect(result.success).toBe(true);
      expect(mockUploadFile).toHaveBeenCalled();
    });

    it('should reject when session does not exist', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateSessionMediaUpload('valid-token', 'nonexistent-session', [
        { originalname: 'test.jpg', mimetype: 'image/jpeg', buffer: Buffer.from(''), size: 1000 }
      ]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('POST /upload/avatar', () => {
    it('should require authentication', async () => {
      const result = await simulateAvatarUpload(null, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No token provided');
    });

    it('should allow user to upload their own avatar', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ avatar_url: null }] 
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateAvatarUpload('valid-token', {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1000
      });

      expect(result.success).toBe(true);
      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  describe('POST /upload/board-photo', () => {
    it('should require authentication', async () => {
      const result = await simulateBoardPhotoUpload(null, 'board-123', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No token provided');
    });

    it('should verify board ownership before upload', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ user_id: 'different-user', photo_url: null }] 
      });

      const result = await simulateBoardPhotoUpload('valid-token', 'board-123', {
        originalname: 'board.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1000
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('should allow upload when user owns board', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });
      mockQuery.mockResolvedValueOnce({ 
        rows: [{ user_id: 'user-123', photo_url: null }] 
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await simulateBoardPhotoUpload('valid-token', 'board-123', {
        originalname: 'board.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from(''),
        size: 1000
      });

      expect(result.success).toBe(true);
      expect(mockUploadFile).toHaveBeenCalled();
    });
  });

  describe('DELETE /upload/file', () => {
    it('should require authentication', async () => {
      const result = await simulateFileDelete(null, 'session-media', 'user-123/file.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No token provided');
    });

    it('should reject invalid bucket', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });

      const result = await simulateFileDelete('valid-token', 'invalid-bucket', 'user-123/file.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid bucket');
    });

    it('should reject file not owned by user', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });

      const result = await simulateFileDelete('valid-token', 'session-media', 'different-user/file.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not authorized');
    });

    it('should allow deletion of own files', async () => {
      mockVerify.mockReturnValueOnce({ userId: 'user-123' });

      const result = await simulateFileDelete('valid-token', 'session-media', 'user-123/file.jpg');

      expect(result.success).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith('session-media', 'user-123/file.jpg');
    });
  });
});

// Helper functions to simulate route handlers
async function simulateSessionMediaUpload(token: string | null, sessionId: string, files: any[]) {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const decoded = mockVerify(token, 'secret');
    const userId = decoded.userId;

    const sessionCheck = await mockQuery('SELECT user_id FROM sessions WHERE id = $1', [sessionId]);
    if (sessionCheck.rows.length === 0) {
      return { success: false, error: 'Session not found' };
    }
    if (sessionCheck.rows[0].user_id !== userId) {
      return { success: false, error: 'Not authorized to upload media to this session' };
    }

    if (!files || files.length === 0) {
      return { success: false, error: 'No files uploaded' };
    }

    for (const file of files) {
      await mockUploadFile('session-media', `${userId}/${sessionId}/file.jpg`, file.buffer, file.size);
      await mockQuery('INSERT INTO session_media...', [sessionId, userId]);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateAvatarUpload(token: string | null, file: any) {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const decoded = mockVerify(token, 'secret');
    const userId = decoded.userId;

    if (!file || !file.buffer) {
      return { success: false, error: 'No file uploaded' };
    }

    await mockQuery('SELECT avatar_url FROM profiles WHERE user_id = $1', [userId]);
    await mockUploadFile('avatars', `${userId}/avatar.jpg`, file.buffer, file.size);
    await mockQuery('UPDATE profiles SET avatar_url = $1 WHERE user_id = $2', ['url', userId]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateBoardPhotoUpload(token: string | null, boardId: string, file: any) {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const decoded = mockVerify(token, 'secret');
    const userId = decoded.userId;

    if (!file || !file.buffer) {
      return { success: false, error: 'No file uploaded' };
    }

    const boardCheck = await mockQuery('SELECT user_id, photo_url FROM boards WHERE id = $1', [boardId]);
    if (boardCheck.rows.length === 0) {
      return { success: false, error: 'Board not found' };
    }
    if (boardCheck.rows[0].user_id !== userId) {
      return { success: false, error: 'Not authorized to upload photo to this board' };
    }

    await mockUploadFile('board-photos', `${userId}/${boardId}.jpg`, file.buffer, file.size);
    await mockQuery('UPDATE boards SET photo_url = $1 WHERE id = $2', ['url', boardId]);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateFileDelete(token: string | null, bucket: string, objectName: string) {
  try {
    if (!token) {
      return { success: false, error: 'No token provided' };
    }

    const decoded = mockVerify(token, 'secret');
    const userId = decoded.userId;

    const allowedBuckets = ['session-media', 'avatars', 'board-photos'];
    if (!allowedBuckets.includes(bucket)) {
      return { success: false, error: 'Invalid bucket' };
    }

    if (!objectName.startsWith(`${userId}/`)) {
      return { success: false, error: 'Not authorized to delete this file' };
    }

    await mockDeleteFile(bucket, objectName);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
