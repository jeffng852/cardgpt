#!/usr/bin/env node
/**
 * Merge-aware production Redis `cardType` backfill (GSD Phase 6 / 06-05 / THI-254).
 *
 * WHY THIS EXISTS: CardGPT has no ORM, so `npx tsc --noEmit` and `next build` pass as soon
 * as the TS types + the static JSON corpus carry `cardType` (06-01) — even though PRODUCTION Upstash Redis
 * (the live card store) is still serving type-less cards. That is a false "done." This script
 * makes the live backfill an explicit, verified, idempotent step (CRY-01's second half).
 *
 * MERGE-AWARE, NEVER CLOBBER: it READS the current `cards` object from Redis, sets `cardType`
 * on each card that lacks one (preserving every other field and any live admin edit), then
 * writes the SAME object back. It must NEVER be replaced by the admin clobber/seed route or any
 * path that writes the static JSON corpus over Redis — that clobbers live admin edits.
 *
 * Credentials come from the environment (repo is PUBLIC — no secrets in this file). Pull prod
 * env with `vercel env pull` (CLI is linked) before running.
 *
 * Usage:
 *   node scripts/backfill-card-type.mjs --dry-run   # preview: read + report, no write
 *   node scripts/backfill-card-type.mjs             # apply: read -> mutate -> write -> read back
 */

import { Redis } from '@upstash/redis';

const CARDS_KEY = 'cards';
const DEFAULT_CARD_TYPE = 'credit'; // all 11 legacy cards are credit cards
const DRY_RUN = process.argv.includes('--dry-run');

// Resolve credentials with the SAME precedence as src/lib/data/redisStorage.ts.
// REAL_STORAGE_* is the prefix actually set in prod (Vercel Marketplace integration) — not a typo.
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
    '[backfill] FATAL: Redis credentials not found in env.\n' +
      '  Expected one of REAL_STORAGE_KV_REST_API_URL / KV_REST_API_URL / UPSTASH_REDIS_REST_URL (+ matching _TOKEN).\n' +
      '  Run `vercel env pull` first (CLI is linked). Do NOT hardcode secrets — this repo is PUBLIC.'
  );
  process.exit(1);
}

const redis = new Redis({ url, token });

function summarize(cards) {
  const typed = cards.filter((c) => c && c.cardType).length;
  return `${typed}/${cards.length} cards carry a cardType`;
}

async function main() {
  console.log(`[backfill] mode: ${DRY_RUN ? 'DRY-RUN (no write)' : 'APPLY'}`);

  // 1. READ current object (merge-aware — mutate what's live, never rebuild from the static JSON corpus).
  const database = await redis.get(CARDS_KEY);

  if (!database) {
    console.error(
      '[backfill] FATAL: Redis key "cards" is empty/null — refusing to seed.\n' +
        '  This is a backfill, not a seed. If prod Redis is genuinely empty, use the normal\n' +
        '  seed path deliberately; do NOT let this script create the corpus from scratch.'
    );
    process.exit(1);
  }

  const cards = Array.isArray(database.cards) ? database.cards : null;
  if (!cards) {
    console.error('[backfill] FATAL: Redis "cards" object has no cards[] array — unexpected shape, aborting.');
    process.exit(1);
  }

  console.log(`[backfill] read ${cards.length} cards (lastUpdated: ${database.lastUpdated}). ${summarize(cards)}.`);

  // 2. Mutate in place: set cardType only where missing/falsy. Leave every other field untouched.
  let changed = 0;
  for (const card of cards) {
    if (!card.cardType) {
      card.cardType = DEFAULT_CARD_TYPE;
      changed++;
    }
  }
  console.log(`[backfill] ${changed} card(s) need cardType='${DEFAULT_CARD_TYPE}'.`);

  if (DRY_RUN) {
    console.log('[backfill] DRY-RUN: no write performed. Re-run without --dry-run to apply.');
    return;
  }

  if (changed === 0) {
    console.log('[backfill] Nothing to change — every card already carries a cardType (idempotent no-op). Skipping write.');
  } else {
    // 3. Refresh timestamp (mirror writeCardsToRedis) and write the whole object back.
    database.lastUpdated = new Date().toISOString();
    if (database.metadata) database.metadata.totalCards = cards.length;
    await redis.set(CARDS_KEY, database);
    console.log(`[backfill] wrote ${cards.length} cards back (lastUpdated: ${database.lastUpdated}).`);
  }

  // 4. Independent READ-BACK proof — do not trust the in-memory object we just wrote.
  const verify = await redis.get(CARDS_KEY);
  const vCards = (verify && Array.isArray(verify.cards)) ? verify.cards : [];
  const missing = vCards.filter((c) => !c || !c.cardType);
  const sample = vCards.find((c) => c && c.id === 'citi-cash-back') || vCards[0];

  console.log(`[backfill] read-back: ${summarize(vCards)}.`);
  if (sample) console.log(`[backfill] sample: ${sample.id} -> cardType='${sample.cardType}'`);

  if (missing.length > 0) {
    console.error(`[backfill] FAIL: ${missing.length} card(s) STILL lack cardType after write:`, missing.map((c) => c && c.id));
    process.exit(1);
  }
  console.log('[backfill] OK: every card in production Redis carries a cardType.');
}

main().catch((err) => {
  console.error('[backfill] FATAL: unhandled error:', err);
  process.exit(1);
});
