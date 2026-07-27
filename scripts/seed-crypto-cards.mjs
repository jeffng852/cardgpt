#!/usr/bin/env node
/**
 * Merge-aware crypto card seed for production Redis (GSD Phase 8 / 08-02 / THI-294).
 *
 * WHY THIS EXISTS: Phase 8 stands up the crypto/neobank card machinery WITHOUT disturbing
 * the 11 live credit cards. This script appends crypto cards to the live Redis `cards` key
 * by NEW id only — it is the operator tool that loads crypto cards alongside the existing
 * corpus. This wave loads a small synthetic FIXTURE (src/data/crypto-cards.fixture.json)
 * that drives machinery testing; the REAL bulk load (ranked.plus facts, provenance-labeled)
 * is deferred to RQ-001 (D-01/D-10) — swapping the input file in is a later data step, not
 * a code change.
 *
 * MERGE-AWARE, NEVER CLOBBER (D-09 / T-08-SEED): modelled on backfill-card-type.mjs, NOT the
 * fresh-seed-only seed-redis.mjs (which clobbers). It READS the live `cards` object, appends
 * only fixture cards whose id is not already present (via the pure, unit-tested mergeCards),
 * writes the SAME object back, then does an INDEPENDENT read-back verify. Existing cards and
 * any live admin edit are never overwritten; re-runs are idempotent (skip existing ids).
 *
 * PUBLIC REPO (T-08-SEED-KEY): credentials come from the environment ONLY — no secret literal
 * lives in this file. Pull a FRESH prod env with `vercel env pull` before running (a stale
 * local .env carrying a removed REAL_STORAGE_* line wins the precedence and points at the
 * wrong/dead host — see CLAUDE.md Operational Runbook).
 *
 * DEFERRED OPERATOR STEP (RQ-001): running this against real prod Redis is NOT part of this
 * plan's build — this plan builds + unit-tests the machinery. When run for real: `vercel env
 * pull` first, then `--dry-run`, inspect, then run without the flag and confirm the read-back.
 *
 * Usage:
 *   node scripts/seed-crypto-cards.mjs --dry-run   # preview: read + merge report, no write
 *   node scripts/seed-crypto-cards.mjs             # apply: read -> merge -> write -> read back
 */

import { Redis } from '@upstash/redis';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mergeCards } from './lib/mergeCards.mjs';

const CARDS_KEY = 'cards';
const DRY_RUN = process.argv.includes('--dry-run');

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, '..', 'src', 'data', 'crypto-cards.fixture.json');

// Resolve credentials with the SAME precedence as src/lib/data/redisStorage.ts.
// REAL_STORAGE_* is listed first for legacy reasons; prod now falls through to KV_*.
const url =
  process.env.REAL_STORAGE_KV_REST_API_URL ||
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.REAL_STORAGE_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error(
    '[seed-crypto] FATAL: Redis credentials not found in env.\n' +
      '  Expected one of REAL_STORAGE_KV_REST_API_URL / KV_REST_API_URL / UPSTASH_REDIS_REST_URL (+ matching _TOKEN).\n' +
      '  Run `vercel env pull` first (CLI is linked). Do NOT hardcode secrets — this repo is PUBLIC.'
  );
  process.exit(1);
}

const redis = new Redis({ url, token });

function loadFixtureCards() {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const cards = Array.isArray(parsed.cards) ? parsed.cards : null;
  if (!cards || cards.length === 0) {
    console.error(`[seed-crypto] FATAL: fixture at ${FIXTURE_PATH} has no cards[] — nothing to seed.`);
    process.exit(1);
  }
  return cards;
}

async function main() {
  console.log(`[seed-crypto] mode: ${DRY_RUN ? 'DRY-RUN (no write)' : 'APPLY'}`);

  const fixtureCards = loadFixtureCards();
  console.log(`[seed-crypto] loaded ${fixtureCards.length} fixture card(s) from ${FIXTURE_PATH}.`);

  // 1. READ the live object. This is a MERGE, not a fresh seed — refuse if the key is empty
  //    (never let this script create the corpus from nothing; that's the seed path's job).
  const database = await redis.get(CARDS_KEY);
  if (!database) {
    console.error(
      '[seed-crypto] FATAL: Redis key "cards" is empty/null — refusing to seed.\n' +
        '  This is a merge-append onto the existing corpus, not a fresh seed. If prod Redis is\n' +
        '  genuinely empty, run the deliberate seed path first; do NOT let this create the corpus.'
    );
    process.exit(1);
  }

  const cards = Array.isArray(database.cards) ? database.cards : null;
  if (!cards) {
    console.error('[seed-crypto] FATAL: Redis "cards" object has no cards[] array — unexpected shape, aborting.');
    process.exit(1);
  }

  const originalIds = cards.map((c) => c && c.id);
  console.log(`[seed-crypto] read ${cards.length} live card(s) (lastUpdated: ${database.lastUpdated}).`);

  // 2. MERGE by new id via the pure, unit-tested helper — never a blanket overwrite.
  const { cards: merged, added } = mergeCards(cards, fixtureCards);
  const skipped = fixtureCards.length - added;
  console.log(`[seed-crypto] merge: ${added} new card(s) to append, ${skipped} already present (skipped).`);

  if (DRY_RUN) {
    console.log('[seed-crypto] DRY-RUN: no write performed. Re-run without --dry-run to apply.');
    return;
  }

  if (added === 0) {
    console.log('[seed-crypto] Nothing new to append — every fixture id already present (idempotent no-op). Skipping write.');
  } else {
    // 3. Write the merged object back (mirror writeCardsToRedis: refresh timestamp + totalCards).
    database.cards = merged;
    database.lastUpdated = new Date().toISOString();
    if (database.metadata) database.metadata.totalCards = merged.length;
    await redis.set(CARDS_KEY, database);
    console.log(`[seed-crypto] wrote ${merged.length} card(s) back (lastUpdated: ${database.lastUpdated}).`);
  }

  // 4. Independent READ-BACK proof — never trust the in-memory object we just wrote.
  const verify = await redis.get(CARDS_KEY);
  const vCards = verify && Array.isArray(verify.cards) ? verify.cards : [];
  const vIds = new Set(vCards.map((c) => c && c.id));

  const missingOriginal = originalIds.filter((id) => !vIds.has(id));
  const missingFixture = fixtureCards.map((c) => c.id).filter((id) => !vIds.has(id));

  console.log(`[seed-crypto] read-back: ${vCards.length} card(s) present.`);
  if (missingOriginal.length > 0) {
    console.error('[seed-crypto] FAIL: pre-existing card id(s) MISSING after write (clobber!):', missingOriginal);
    process.exit(1);
  }
  if (missingFixture.length > 0) {
    console.error('[seed-crypto] FAIL: fixture card id(s) NOT present after write:', missingFixture);
    process.exit(1);
  }
  console.log('[seed-crypto] OK: every original card survived and every fixture card is present.');
}

main().catch((err) => {
  console.error('[seed-crypto] FATAL: unhandled error:', err);
  process.exit(1);
});
