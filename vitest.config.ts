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
//
// Phase 8 (08-02, THI-294): the `include` glob is broadened to ALSO collect test
// files under scripts/ (`.ts`/`.mts`/`.mjs`). The safety-critical merge logic for
// the crypto seed script is extracted into a pure helper (scripts/lib/mergeCards.mjs)
// so it is unit-testable without a live/mocked Redis (D-09); this glob is what makes
// `scripts/__tests__/*.test.ts` run under `npm test`. The existing `src/**` glob is
// left intact so the Phase 7 fiat snapshot and every other src test still collect.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'scripts/**/*.{test,spec}.{ts,mts,mjs}',
    ],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
