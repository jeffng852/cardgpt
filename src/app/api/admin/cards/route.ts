/**
 * Admin API: Card CRUD Operations
 *
 * GET /api/admin/cards - List all cards (including inactive)
 * POST /api/admin/cards - Create a new card
 *
 * Authentication: Cookie-based session or Bearer token
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllCardsAsync, getDatabaseStats } from '@/lib/data/cardRepository';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createCard } from '@/lib/data/cardWriter';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import type { CreditCard } from '@/types/card';

// Helper to add no-cache headers to response
function noCacheResponse(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    },
  });
}

/**
 * GET /api/admin/cards
 * List all cards with optional filters
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';
    const issuerId = searchParams.get('issuer');
    const activeOnly = searchParams.get('active') === 'true';

    let cards = await getAllCardsAsync();

    // Apply filters
    if (issuerId) {
      cards = cards.filter(c => c.issuer.toLowerCase() === issuerId.toLowerCase());
    }
    if (activeOnly) {
      cards = cards.filter(c => c.isActive);
    }

    const response: {
      cards: CreditCard[];
      total: number;
      stats?: Awaited<ReturnType<typeof getDatabaseStats>>;
    } = {
      cards,
      total: cards.length,
    };

    if (includeStats) {
      response.stats = await getDatabaseStats();
    }

    return noCacheResponse(response);
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return noCacheResponse(
      { error: 'Internal Server Error', message: 'Failed to fetch cards' },
      500
    );
  }
}

/**
 * POST /api/admin/cards
 * Create a new card
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Ensure required fields have defaults
    const card: CreditCard = {
      ...body,
      isActive: body.isActive ?? true,
      lastUpdated: new Date().toISOString(),
    };

    const result = await createCard(card);

    if (!result.success) {
      return noCacheResponse(
        {
          error: 'Validation Error',
          message: result.error,
          validationErrors: result.validationErrors,
        },
        400
      );
    }

    return noCacheResponse(
      { success: true, card: result.data },
      201
    );
  } catch (error) {
    console.error('Failed to create card:', error);
    return noCacheResponse(
      { error: 'Internal Server Error', message: 'Failed to create card' },
      500
    );
  }
}
