/**
 * Jest Test Setup
 * Configures test environment and global mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_NAME = 'salt_app_test';
process.env.DATABASE_USER = 'test_user';
process.env.DATABASE_PASSWORD = 'test_password';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Silence console.log during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// Global afterEach to ensure clean state
afterEach(() => {
  jest.clearAllMocks();
});
