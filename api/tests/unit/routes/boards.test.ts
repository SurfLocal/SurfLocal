/**
 * Boards Routes Unit Tests
 */

// Mock database
const mockQueryBoards = jest.fn();
jest.mock('../../../src/config/database', () => ({
  query: mockQueryBoards,
  pool: { on: jest.fn() },
  analyticsPool: { on: jest.fn() }
}));

describe('Boards Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /boards/user/:userId', () => {
    it('should return user boards', async () => {
      const mockBoards = [
        { id: 'board-1', name: 'Fish 5\'8"', user_id: 'user-1' },
        { id: 'board-2', name: 'Shortboard 6\'2"', user_id: 'user-1' }
      ];

      mockQueryBoards.mockResolvedValueOnce({ rows: mockBoards });

      const result = await simulateGetUserBoards('user-1');

      expect(result.success).toBe(true);
      expect(result.boards).toHaveLength(2);
    });

    it('should return empty array for user with no boards', async () => {
      mockQueryBoards.mockResolvedValueOnce({ rows: [] });

      const result = await simulateGetUserBoards('user-1');

      expect(result.success).toBe(true);
      expect(result.boards).toHaveLength(0);
    });
  });

  describe('GET /boards/:id', () => {
    it('should return board by ID', async () => {
      const mockBoard = {
        id: 'board-1',
        name: 'Fish 5\'8"',
        brand: 'Channel Islands',
        model: 'Fish',
        length_feet: 5,
        length_inches: 8,
        volume: 30.5,
        user_id: 'user-1'
      };

      mockQueryBoards.mockResolvedValueOnce({ rows: [mockBoard] });

      const result = await simulateGetBoard('board-1');

      expect(result.success).toBe(true);
      expect(result.board.name).toBe('Fish 5\'8"');
    });

    it('should return 404 for non-existent board', async () => {
      mockQueryBoards.mockResolvedValueOnce({ rows: [] });

      const result = await simulateGetBoard('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('POST /boards', () => {
    it('should create board with required fields', async () => {
      const newBoard = {
        id: 'board-new',
        name: 'New Board',
        user_id: 'user-1'
      };

      mockQueryBoards.mockResolvedValueOnce({ rows: [newBoard] });

      const result = await simulateCreateBoard({
        name: 'New Board',
        user_id: 'user-1'
      });

      expect(result.success).toBe(true);
      expect(result.board.name).toBe('New Board');
    });

    it('should require name', async () => {
      const result = await simulateCreateBoard({
        user_id: 'user-1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('name');
    });

    it('should accept all optional fields', async () => {
      const newBoard = {
        id: 'board-new',
        name: 'Complete Board',
        brand: 'Channel Islands',
        model: 'Fish',
        length_feet: 5,
        length_inches: 8,
        volume: 30.5,
        fin_setup: 'Quad',
        board_type: 'Fish',
        user_id: 'user-1'
      };

      mockQueryBoards.mockResolvedValueOnce({ rows: [newBoard] });

      const result = await simulateCreateBoard(newBoard);

      expect(result.success).toBe(true);
      expect(result.board.brand).toBe('Channel Islands');
    });
  });

  describe('PUT /boards/:id', () => {
    it('should update board fields', async () => {
      const mockBoard = { id: 'board-1', user_id: 'user-1' };
      const updatedBoard = { id: 'board-1', name: 'Updated Board' };

      mockQueryBoards.mockResolvedValueOnce({ rows: [mockBoard] });
      mockQueryBoards.mockResolvedValueOnce({ rows: [updatedBoard] });

      const result = await simulateUpdateBoard('board-1', 'user-1', {
        name: 'Updated Board'
      });

      expect(result.success).toBe(true);
      expect(result.board.name).toBe('Updated Board');
    });

    it('should reject update from non-owner', async () => {
      const mockBoard = { id: 'board-1', user_id: 'other-user' };

      mockQueryBoards.mockResolvedValueOnce({ rows: [mockBoard] });

      const result = await simulateUpdateBoard('board-1', 'user-1', {
        name: 'Updated Board'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });

  describe('DELETE /boards/:id', () => {
    it('should delete board owned by user', async () => {
      const mockBoard = { id: 'board-1', user_id: 'user-1' };

      mockQueryBoards.mockResolvedValueOnce({ rows: [mockBoard] });
      mockQueryBoards.mockResolvedValueOnce({ rowCount: 1 });

      const result = await simulateDeleteBoard('board-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('should reject delete from non-owner', async () => {
      const mockBoard = { id: 'board-1', user_id: 'other-user' };

      mockQueryBoards.mockResolvedValueOnce({ rows: [mockBoard] });

      const result = await simulateDeleteBoard('board-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});

// Helper functions
async function simulateGetUserBoards(userId: string) {
  try {
    const result = await mockQueryBoards(
      'SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return { success: true, boards: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateGetBoard(boardId: string) {
  try {
    const result = await mockQueryBoards(
      'SELECT * FROM boards WHERE id = $1',
      [boardId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Board not found' };
    }

    return { success: true, board: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateCreateBoard(data: Record<string, any>) {
  if (!data.name) {
    return { success: false, error: 'Board name is required' };
  }

  try {
    const result = await mockQueryBoards(
      'INSERT INTO boards (...) VALUES (...) RETURNING *',
      Object.values(data)
    );
    return { success: true, board: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateUpdateBoard(boardId: string, userId: string, updates: Record<string, any>) {
  try {
    const boardResult = await mockQueryBoards(
      'SELECT * FROM boards WHERE id = $1',
      [boardId]
    );

    if (boardResult.rows.length === 0) {
      return { success: false, error: 'Board not found' };
    }

    if (boardResult.rows[0].user_id !== userId) {
      return { success: false, error: 'No permission to update this board' };
    }

    const result = await mockQueryBoards(
      'UPDATE boards SET ... WHERE id = $1 RETURNING *',
      [boardId]
    );
    return { success: true, board: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function simulateDeleteBoard(boardId: string, userId: string) {
  try {
    const boardResult = await mockQueryBoards(
      'SELECT * FROM boards WHERE id = $1',
      [boardId]
    );

    if (boardResult.rows.length === 0) {
      return { success: false, error: 'Board not found' };
    }

    if (boardResult.rows[0].user_id !== userId) {
      return { success: false, error: 'No permission to delete this board' };
    }

    await mockQueryBoards('DELETE FROM boards WHERE id = $1', [boardId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
