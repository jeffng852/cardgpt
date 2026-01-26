#!/usr/bin/env node

/**
 * Health Check Script
 * Validates critical files exist before starting dev server
 * Prevents the "missing page files" issue from happening again
 */

const fs = require('fs');
const path = require('path');

const CRITICAL_FILES = [
  'src/app/[locale]/page.tsx',
  'src/app/[locale]/layout.tsx',
  'src/i18n/routing.ts',
  'package.json',
  'tsconfig.json',
];

// Next.js 16 migrated `middleware.ts` -> `proxy.ts`.
// Accept either so older branches still pass locally.
const ROUTING_FILES_ANY_OF = ['src/proxy.ts', 'src/middleware.ts'];

const CRITICAL_DIRS = [
  'src/app',
  'src/components',
  'src/lib',
  'src/data',
];

let hasErrors = false;

console.log('🏥 Running health check...\n');

// Check critical files
console.log('📄 Checking critical files:');
CRITICAL_FILES.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Missing: ${file}`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${file}`);
  }
});

// Check routing file convention (proxy vs middleware)
const routingCandidates = ROUTING_FILES_ANY_OF.map(file => ({
  file,
  filePath: path.join(process.cwd(), file),
}));
const existingRoutingFiles = routingCandidates.filter(c =>
  fs.existsSync(c.filePath)
);
if (existingRoutingFiles.length === 0) {
  console.error(`  ❌ Missing: ${ROUTING_FILES_ANY_OF.join(' OR ')}`);
  hasErrors = true;
} else {
  existingRoutingFiles.forEach(c => console.log(`  ✅ ${c.file}`));
}

// Check critical directories
console.log('\n📁 Checking critical directories:');
CRITICAL_DIRS.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.error(`  ❌ Missing: ${dir}`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${dir}`);
  }
});

// Check node_modules
console.log('\n📦 Checking dependencies:');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('  ❌ node_modules not found. Run: npm install');
  hasErrors = true;
} else {
  console.log('  ✅ node_modules exists');
}

if (hasErrors) {
  console.error('\n🚨 Health check FAILED');
  console.error('\n💡 Troubleshooting:');
  console.error('  1. Run: git status (check for deleted files)');
  console.error('  2. Run: git restore <file> (restore missing files)');
  console.error('  3. Run: npm install (if node_modules missing)');
  process.exit(1);
}

console.log('\n✅ Health check PASSED - all systems go!\n');
process.exit(0);
