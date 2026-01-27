#!/usr/bin/env node

/**
 * Free port 3000 before starting dev server.
 * A stuck process on 3000 causes Next.js to use 3001, so opening
 * localhost:3000 hangs ("not responding"). Killing it ensures dev uses 3000.
 */

const { execSync } = require('child_process');

try {
  execSync('lsof -ti :3000 | xargs kill -9 2>/dev/null', { stdio: 'ignore' });
} catch (_) {
  /* ignore */
}
