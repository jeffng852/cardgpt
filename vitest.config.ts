// vitest.config.ts (repo root)
//
// First test-runner config for this repo (TECH-01 / OPEN-008). Deliberately
// minimal — single-artifact simplicity:
//   - environment 'node'  : the reward engine is pure TS, no DOM needed.
//   - globals true        : the two pre-existing test files use bare
//                           describe/it/expect (written before a runner existed).
//   - resolve.alias @→src : lets tests import runtime values + JSON via `@/`,
//                           mirroring tsconfig `paths` (resolveJsonModule is on).
// No jsdom/happy-dom, no coverage, no plugins.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
