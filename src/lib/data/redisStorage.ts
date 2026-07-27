/**
 * Upstash Redis Storage for Card Data
 *
 * Simple, reliable storage with immediate consistency.
 * Used in production where the filesystem is read-only.
 *
 * Setup:
 * 1. Create Upstash Redis via Vercel Marketplace
 * 2. Environment variables are auto-added (e.g.):
 *    - REAL_STORAGE_KV_REST_API_URL
 *    - REAL_STORAGE_KV_REST_API_TOKEN
 *    Also supports: KV_REST_API_URL/TOKEN, UPSTASH_REDIS_REST_URL/TOKEN
 */

import { Redis } from '@upstash/redis';
import type { CardDatabase } from './cardRepository';
import type { HkdRateTable } from '@/types/card';

const CARDS_KEY = 'cards';

/**
 * Redis key holding the crypto→HKD rate table (DEC-DATA-002, D-03). The stored
 * value is an HkdRateTable keyed by the asset `shortName` ticker in EXACT casing
 * (e.g. `USDC`, `ETH`) — the 08-04 cron writes here; the home page reads it.
 */
const RATES_KEY = 'crypto-rates';

// Lazy initialization to avoid errors when env vars aren't set
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    // Support Vercel Marketplace integration (REAL_STORAGE_*), generic KV, and direct Upstash names
    const url =
      process.env.REAL_STORAGE_KV_REST_API_URL ||
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.REAL_STORAGE_KV_REST_API_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN;

    redis = new Redis({ url: url!, token: token! });
  }
  return redis;
}

/**
 * Check if we're in a Vercel production environment
 */
export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';
}

/**
 * Check if Redis storage is configured
 */
export function isRedisConfigured(): boolean {
  const url =
    process.env.REAL_STORAGE_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.REAL_STORAGE_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  return !!(url && token);
}

/**
 * Read cards data from Redis
 */
export async function readCardsFromRedis(): Promise<CardDatabase | null> {
  try {
    console.log('[Redis] Reading cards from Redis...');
    const data = await getRedis().get<CardDatabase>(CARDS_KEY);

    if (data) {
      console.log(`[Redis] Read ${data.cards?.length || 0} cards, lastUpdated: ${data.lastUpdated}`);
      return data;
    }

    console.log('[Redis] No cards found in Redis');
    return null;
  } catch (error) {
    console.error('[Redis] Failed to read cards:', error);
    return null;
  }
}

/**
 * Write cards data to Redis
 * Returns the written data immediately (Redis has strong consistency)
 */
export async function writeCardsToRedis(database: CardDatabase): Promise<{ success: boolean; data?: CardDatabase }> {
  try {
    // Update timestamp
    database.lastUpdated = new Date().toISOString();

    if (database.metadata) {
      database.metadata.totalCards = database.cards.length;
    }

    console.log(`[Redis] Writing ${database.cards.length} cards with timestamp: ${database.lastUpdated}`);

    await getRedis().set(CARDS_KEY, database);

    console.log('[Redis] Write successful');
    return { success: true, data: database };
  } catch (error) {
    console.error('[Redis] Failed to write cards:', error);
    return { success: false };
  }
}

/**
 * Read the crypto→HKD rate table from Redis (DEC-DATA-002, D-03).
 *
 * Clone of readCardsFromRedis against the 'crypto-rates' key, reusing the same
 * getRedis() singleton. Fail-safe (08-RESEARCH Pitfall 3 / T-08-RATE-AVAIL):
 * returns null — never throws — on an absent key or a rejected Redis get, so the
 * home page degrades to crypto-valued-null (Phase 7's fail-safe) instead of 500ing.
 */
export async function readRateTableFromRedis(): Promise<HkdRateTable | null> {
  try {
    const data = await getRedis().get<HkdRateTable>(RATES_KEY);

    if (data) {
      return data;
    }

    console.log('[Redis] No crypto-rates table found in Redis');
    return null;
  } catch (error) {
    console.error('[Redis] Failed to read rate table:', error);
    return null;
  }
}

/**
 * Write fresh crypto→HKD rates to Redis with a per-ticker MERGE (D-04 / Pitfall 2 /
 * T-08-RATE).
 *
 * Reads the existing table, spreads `freshRates` OVER it, and writes the merged
 * object back — a ticker present in the stored table but absent from `freshRates`
 * keeps its previous rate (never nulled by a partial refresh). Mirrors the
 * read-merge-write shape of the backfill scripts; this is the tampering backstop
 * that stops a partial cron write from wiping last-known-good rates. An empty
 * `freshRates` leaves the stored table unchanged. Never throws.
 */
export async function writeRateTableToRedis(
  freshRates: HkdRateTable
): Promise<{ success: boolean }> {
  try {
    const existing = (await getRedis().get<HkdRateTable>(RATES_KEY)) ?? {};
    const merged: HkdRateTable = { ...existing, ...freshRates };

    await getRedis().set(RATES_KEY, merged);

    return { success: true };
  } catch (error) {
    console.error('[Redis] Failed to write rate table:', error);
    return { success: false };
  }
}

/**
 * Initialize Redis with data from local cards.json
 */
export async function initializeRedisFromLocal(localData: CardDatabase): Promise<boolean> {
  console.log('[Redis] Initializing Redis with local cards.json data...');
  const result = await writeCardsToRedis(localData);
  return result.success;
}
