import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.js'],
    setupFiles: ['./vitest.setup.js']
  }
});
