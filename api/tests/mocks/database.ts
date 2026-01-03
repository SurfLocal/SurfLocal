/**
 * Database Mock
 * Provides mock implementations for database operations
 */

export const mockQueryResult = (rows: any[], rowCount = rows.length) => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: []
});

export const createMockPool = () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn()
});

export const mockQuery = jest.fn();
export const mockAnalyticsQuery = jest.fn();
export const mockGetClient = jest.fn();

// Mock the database module
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  analyticsQuery: mockAnalyticsQuery,
  getClient: mockGetClient,
  pool: createMockPool(),
  analyticsPool: createMockPool()
}));

// Helper to reset all database mocks
export const resetDatabaseMocks = () => {
  mockQuery.mockReset();
  mockAnalyticsQuery.mockReset();
  mockGetClient.mockReset();
};

// Helper to setup mock query responses
export const setupMockQuery = (responses: { [key: string]: any }) => {
  mockQuery.mockImplementation((sql: string) => {
    for (const [pattern, result] of Object.entries(responses)) {
      if (sql.toLowerCase().includes(pattern.toLowerCase())) {
        return Promise.resolve(result);
      }
    }
    return Promise.resolve(mockQueryResult([]));
  });
};
