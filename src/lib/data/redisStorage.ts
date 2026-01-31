/**
 * Upstash Redis Storage for Card Data
 *
 * Simple, reliable storage with immediate consistency.
 * Used in production where the filesystem is read-only.
 *
 * Setup:
 * 1. Create Upstash Redis via Vercel Marketplace
 * 2. Environment variables are auto-added:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from '@upstash/redis';
import type { CardDatabase } from './cardRepository';

const CARDS_KEY = 'cards';

// Lazy initialization to avoid errors when env vars aren't set
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
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
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
 * Initialize Redis with data from local cards.json
 */
export async function initializeRedisFromLocal(localData: CardDatabase): Promise<boolean> {
  console.log('[Redis] Initializing Redis with local cards.json data...');
  const result = await writeCardsToRedis(localData);
  return result.success;
}
