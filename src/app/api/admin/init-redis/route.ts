/**
 * Admin API: Initialize Redis Storage
 *
 * POST /api/admin/init-redis
 * Uploads the current cards.json to Upstash Redis
 *
 * This endpoint should be called once after setting up Redis
 * to initialize the storage with your existing card data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import { getDatabase } from '@/lib/data/cardRepository';
import {
  isRedisConfigured,
  isProductionEnvironment,
  readCardsFromRedis,
  writeCardsToRedis,
} from '@/lib/data/redisStorage';

export async function POST(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    if (!isRedisConfigured()) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set',
        },
        { status: 500 }
      );
    }

    // Get current database from static import
    const database = getDatabase();

    // Upload to Redis
    const result = await writeCardsToRedis(database);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Upload Failed',
          message: 'Failed to upload cards data to Redis',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cards data uploaded to Redis successfully',
      stats: {
        totalCards: database.cards.length,
        activeCards: database.cards.filter(c => c.isActive).length,
        lastUpdated: result.data?.lastUpdated,
        version: database.version,
      },
    });
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init-redis
 * Check Redis status
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const redisConfigured = isRedisConfigured();

    if (!redisConfigured) {
      return NextResponse.json({
        redisConfigured: false,
        message: 'Upstash Redis is not configured',
      });
    }

    // Try to read from Redis
    const redisData = await readCardsFromRedis();

    if (!redisData) {
      return NextResponse.json({
        redisConfigured: true,
        redisInitialized: false,
        message: 'Redis is configured but empty. Run POST to initialize.',
        environment: {
          isProductionEnvironment: isProductionEnvironment(),
          VERCEL: process.env.VERCEL,
          NODE_ENV: process.env.NODE_ENV,
        },
      });
    }

    return NextResponse.json({
      redisConfigured: true,
      redisInitialized: true,
      stats: {
        totalCards: redisData.cards.length,
        activeCards: redisData.cards.filter(c => c.isActive).length,
        lastUpdated: redisData.lastUpdated,
        version: redisData.version,
      },
      environment: {
        isProductionEnvironment: isProductionEnvironment(),
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    console.error('Failed to check Redis status:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
