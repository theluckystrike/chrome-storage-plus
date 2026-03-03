import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    bail: true,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
    },
  },
});
