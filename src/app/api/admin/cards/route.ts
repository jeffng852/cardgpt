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

// Force dynamic rendering so we always check blob storage
export const dynamic = 'force-dynamic';
import { createCard } from '@/lib/data/cardWriter';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import type { CreditCard } from '@/types/card';

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch cards' },
      { status: 500 }
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
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: result.error,
          validationErrors: result.validationErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, card: result.data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create card:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create card' },
      { status: 500 }
    );
  }
}
