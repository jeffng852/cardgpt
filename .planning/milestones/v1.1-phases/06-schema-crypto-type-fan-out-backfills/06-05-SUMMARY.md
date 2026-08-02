---
phase: 06-schema-crypto-type-fan-out-backfills
plan: 05
subsystem: infrastructure
tags: [upstash-redis, prod-data, cardType, CRY-01, vercel-migration, seed, deviation]

# Dependency graph
requires:
  - phase: 06-01
    provides: cardType on all 11 cards in cards.json (the corpus that was seeded into prod Redis)
  - phase: 06-04
    provides: rewardCap-free corpus (the exact cards.json content seeded)
provides:
  - production Upstash Redis carrying cardType on every card (CRY-01 prod-truth half, proven by read-back)
  - scripts/seed-redis.mjs (fresh-seed from cards.json, never-clobber via SET nx, read-back verified)
  - scripts/backfill-card-type.mjs (merge-aware idempotent cardType backfill — retained maintenance tool)
---

# 06-05 — Production Redis cardType: re-provision + seed (THI-254)

**Status:** COMPLETE (verified against live Redis)
**Requirement:** CRY-01 (production-truth half)
**Date:** 2026-07-24

## Major deviation from the plan (approved)

The plan (06-05) assumed a live production Upstash Redis to **backfill** `cardType` onto. Reality
differed: the original production Upstash database had been **decommissioned** — its Vercel
integration (`cardgpt-real-prod`) showed `Uninstalled` and its host
(`popular-tarpon-49228.upstash.io`) no longer resolved on public DNS. The live site had been
silently serving the build-time `cards.json` fallback for months (the recommender only reads, and
the code bundles its own copy), so nothing visibly broke — but there was no live persistence to
backfill.

The operator elected to **migrate the Vercel project to the Thirdvisor (Pro) team first, then
rebuild the store there** (marketplace/storage resources are team-owned and do not transfer, so
provisioning on the old team then migrating would have forced a redo).

Because the corpus already carries `cardType` on all 11 cards (06-01), the fix became a **fresh
seed** rather than a backfill — seeding the empty new DB from `cards.json` satisfies CRY-01 outright.

## What was actually done

1. **Vercel project transfer:** `cardgpt` moved from personal `jeffng852` (hobby) → `Thirdvisor`
   (Pro) team. `cardgpt-beta.vercel.app` survived, GitHub connection intact, env vars carried over.
2. **New Upstash DB:** provisioned `cardgpt-prod` on Thirdvisor (host `grown-starfish-176247.upstash.io`,
   confirmed live on public DNS). It adds standard `KV_*` credentials (not the old `REAL_STORAGE_*`).
3. **Env cleanup:** removed the 5 orphaned `REAL_STORAGE_*` vars (dead host) across all environments —
   they would have shadowed the new `KV_*` creds via the code's env precedence (`REAL_STORAGE_* || KV_* || UPSTASH_*`).
4. **Seed:** `scripts/seed-redis.mjs` wrote the 11-card corpus to Redis key `cards`, then read it
   back to verify. Fresh-seed only (aborts if `cards` already populated; write uses `SET … nx` for a
   server-side never-clobber guarantee).
5. **Redeploy:** production redeployed so the app runs on the new database (env changes need a deploy).

## Verification (against Redis itself — the plan's real bar)

- Seed apply: `wrote 11 cards … read-back: 11/11 carry cardType … citi-cash-back -> cardType='credit' … OK`.
- Fresh-seed guard: a second run **refuses** ("cards ALREADY populated — refusing to clobber"), exit 1.
- Production Ops-Grace after redeploy: home `200`, `/en` recommender `200`, `/admin` `307 → /admin/login` (gated).
- Build/typecheck are explicitly NOT the proof here — the direct Redis read-back is. No test runner used (vitest is Phase 7).

## Artifacts produced

- `scripts/seed-redis.mjs` — fresh-seed script (used for this rebuild; reusable).
- `scripts/backfill-card-type.mjs` — merge-aware idempotent backfill (retained; will matter when
  Phase 8's bulk crypto seed lands cards that may need cardType normalization).

## Follow-ups (out of scope, non-blocking)

- **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) still points at the old hobby-team store. Investigated and
  **intentionally not re-provisioned**: card images are served from static `public/cards/*.png`
  (`src/lib/cardImages.ts`), and Blob is used only by the admin runtime image-upload route
  (`/api/admin/upload`) — dispensable given the `add-card-images.sh` static workflow. Token left as a
  harmless orphan.
- **Admin-edit persistence** end-to-end (log in, edit a card, confirm it saves to the new Redis) is a
  recommended manual check — the read/seed path is proven; this closes the loop on writes.
- Repo docs (`CLAUDE.md`, `.planning/`) updated in the same close-out to reflect `KV_*` (was `REAL_STORAGE_*`)
  and that Redis is now genuinely the live store again.
