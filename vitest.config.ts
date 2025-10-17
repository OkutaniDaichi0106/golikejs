import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    coverage: {
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/**/*.d.ts'],
    },
    globals: true,
    // Vitest clears mocks and resets modules by default
  },
  resolve: {
    alias: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  },
});