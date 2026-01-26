# Development Workflow

## Quick Start

```bash
# Start development server (with health check)
npm run dev

# Skip health check (if you know what you're doing)
npm run dev:skip-check

# Run health check manually
npm run health-check
```

## Development Cycle

1. **Pull latest code**
2. **Run health check** - `npm run health-check`
3. **Start dev server** - `npm run dev` (auto-runs health check)
4. **Make changes**
5. **Check what changed** - `git status`
6. **Test locally** - verify in browser
7. **Commit** - `git add . && git commit -m "message"`
8. **Push** - `git push`

## When Things Break

**DON'T immediately reinstall node_modules!**

Instead:
1. Run `git status` (see what changed)
2. Run `npm run health-check` (identify issue)
3. Apply targeted fix:
   - Missing file? → `git restore <file>`
   - Dependency issue? → Check specific package
4. Last resort: `rm -rf node_modules package-lock.json && npm install`

## Health Check

The health check validates:
- ✅ Critical files exist (page.tsx, layout.tsx, etc.)
- ✅ Critical directories exist (src/app, src/components, etc.)
- ✅ node_modules is installed

If health check fails:
```bash
# Check for deleted files
git status

# Restore missing files
git restore src/app/[locale]/page.tsx src/app/[locale]/layout.tsx

# Reinstall dependencies if needed
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with health check |
| `npm run dev:skip-check` | Start dev server without health check |
| `npm run health-check` | Run health check only |
| `npm run build` | Build for production (with health check) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run add-card-images` | Add card images automation |

## Troubleshooting

### Server won't start
```bash
npm run health-check  # See what's wrong
git status           # Check for changes
```

### Missing files
```bash
git restore <file>   # Restore from git
```

### Dependency issues
```bash
npm install <package>  # Install specific package
```

### Complete reset (last resort)
```bash
rm -rf node_modules package-lock.json
npm install
```

## File Protection

Critical files protected by health check:
- `src/app/[locale]/page.tsx` - Main page
- `src/app/[locale]/layout.tsx` - Layout wrapper
- `src/middleware.ts` - Next.js middleware
- `src/i18n/routing.ts` - Internationalization config
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config

If any of these are missing, health check will fail and prevent the server from starting.

## Configuration Files

- `.npmrc` - Locks dependencies to exact versions
- `next.config.js` - Next.js configuration (fixes Turbopack warnings)
- `scripts/health-check.js` - Health check implementation

## Next Steps

**Priority 2 (Next session):**
- [ ] Add pre-commit hooks with husky
- [ ] Add timezone config to fix next-intl warning

**Priority 3 (When you have time):**
- [ ] Set up Docker for consistent environment
- [ ] Add automated testing to CI/CD
- [ ] Add file watcher for live validation

---

**Last Updated**: 2026-01-22
**Version**: 1.0
