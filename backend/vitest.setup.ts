import { vi, beforeEach } from 'vitest';

// Mock @vercel/postgres sql function
vi.mock('@vercel/postgres', () => {
  const mockSql = vi.fn();
  return {
    sql: mockSql
  };
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
