#!/usr/bin/env node
/**
 * Fresh-seed production Upstash Redis from the static JSON corpus (GSD Phase 6 / THI-254).
 *
 * CONTEXT: The original production Upstash database was decommissioned (the integration was
 * uninstalled; its host stopped resolving). A new empty Upstash database was provisioned on the
 * Thirdvisor Pro team. This script loads the canonical 11-card corpus from `src/data/cards.json`
 * — which already carries `cardType` on every card (Phase 6, PR #3) — into the new empty store.
 * That satisfies CRY-01 ("every card in prod carries a cardType") without any backfill.
 *
 * FRESH-SEED ONLY: it refuses to run if the `cards` key is already populated, so it can never
 * clobber a live store. For an already-populated store that merely lacks `cardType`, use the
 * merge-aware `backfill-card-type.mjs` instead.
 *
 * Credentials come from the environment (repo is PUBLIC — no secrets here). Pull prod env with
 * `vercel env pull` first. Env precedence matches src/lib/data/redisStorage.ts.
 *
 * Usage:
 *   node scripts/seed-redis.mjs --dry-run   # read corpus + check store is empty, no write
 *   node scripts/seed-redis.mjs             # seed the empty store, then read back to verify
 */

import { Redis } from '@upstash/redis';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CARDS_KEY = 'cards';
const DRY_RUN = process.argv.includes('--dry-run');
const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = join(__dirname, '..', 'src', 'data', 'cards.json');

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
    '[seed] FATAL: Redis credentials not found in env.\n' +
      '  Expected REAL_STORAGE_KV_REST_API_URL / KV_REST_API_URL / UPSTASH_REDIS_REST_URL (+ matching _TOKEN).\n' +
      '  Run `vercel env pull` first. Do NOT hardcode secrets — this repo is PUBLIC.'
  );
  process.exit(1);
}

const redis = new Redis({ url, token });

async function main() {
  console.log(`[seed] mode: ${DRY_RUN ? 'DRY-RUN (no write)' : 'APPLY'}`);

  // Load the canonical corpus from the repo.
  const database = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
  const cards = Array.isArray(database.cards) ? database.cards : null;
  if (!cards || cards.length === 0) {
    console.error('[seed] FATAL: cards.json has no cards[] — refusing to seed an empty corpus.');
    process.exit(1);
  }
  const untyped = cards.filter((c) => !c || !c.cardType);
  console.log(`[seed] corpus: ${cards.length} cards, ${cards.length - untyped.length}/${cards.length} carry cardType.`);
  if (untyped.length > 0) {
    console.error('[seed] FATAL: corpus has cards WITHOUT cardType:', untyped.map((c) => c && c.id));
    process.exit(1);
  }

  // Fresh-seed guard: never clobber an already-populated store.
  const existing = await redis.get(CARDS_KEY);
  if (existing) {
    const n = Array.isArray(existing.cards) ? existing.cards.length : '?';
    console.error(
      `[seed] FATAL: Redis key "cards" is ALREADY populated (${n} cards). Refusing to clobber.\n` +
        '  This script is fresh-seed only. To add cardType to an existing store, use backfill-card-type.mjs.'
    );
    process.exit(1);
  }
  console.log('[seed] target store is empty — safe to seed.');

  if (DRY_RUN) {
    console.log('[seed] DRY-RUN: no write performed. Re-run without --dry-run to seed.');
    return;
  }

  // Refresh bookkeeping fields (mirror writeCardsToRedis) and write.
  database.lastUpdated = new Date().toISOString();
  if (database.metadata) database.metadata.totalCards = cards.length;
  await redis.set(CARDS_KEY, database);
  console.log(`[seed] wrote ${cards.length} cards (lastUpdated: ${database.lastUpdated}).`);

  // Independent read-back proof.
  const verify = await redis.get(CARDS_KEY);
  const vCards = verify && Array.isArray(verify.cards) ? verify.cards : [];
  const missing = vCards.filter((c) => !c || !c.cardType);
  const sample = vCards.find((c) => c && c.id === 'citi-cash-back') || vCards[0];
  console.log(`[seed] read-back: ${vCards.length} cards, ${vCards.length - missing.length}/${vCards.length} carry cardType.`);
  if (sample) console.log(`[seed] sample: ${sample.id} -> cardType='${sample.cardType}'`);

  if (vCards.length !== cards.length || missing.length > 0) {
    console.error(`[seed] FAIL: read-back mismatch (expected ${cards.length}, got ${vCards.length}; ${missing.length} untyped).`);
    process.exit(1);
  }
  console.log('[seed] OK: production Redis seeded — every card carries a cardType.');
}

main().catch((err) => {
  console.error('[seed] FATAL: unhandled error:', err);
  process.exit(1);
});
