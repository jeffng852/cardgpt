/**
 * Admin API: Single Card Operations
 *
 * GET /api/admin/cards/[id] - Get a single card
 * PUT /api/admin/cards/[id] - Update a card
 * DELETE /api/admin/cards/[id] - Delete a card (soft or hard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCardByIdAsync } from '@/lib/data/cardRepository';

// Force dynamic rendering and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { updateCard, deactivateCard, deleteCard } from '@/lib/data/cardWriter';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import type { CreditCard } from '@/types/card';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
 * GET /api/admin/cards/[id]
 * Get a single card by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const card = await getCardByIdAsync(id);

    if (!card) {
      return noCacheResponse(
        { error: 'Not Found', message: `Card with ID "${id}" not found` },
        404
      );
    }

    return noCacheResponse({ card });
  } catch (error) {
    console.error('Failed to fetch card:', error);
    return noCacheResponse(
      { error: 'Internal Server Error', message: 'Failed to fetch card' },
      500
    );
  }
}

/**
 * PUT /api/admin/cards/[id]
 * Update a card
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    // Remove id from body to prevent ID changes
    const { id: _, ...updates } = body as Partial<CreditCard> & { id?: string };

    const result = await updateCard(id, updates);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return noCacheResponse(
        {
          error: status === 404 ? 'Not Found' : 'Validation Error',
          message: result.error,
          validationErrors: result.validationErrors,
        },
        status
      );
    }

    return noCacheResponse({ success: true, card: result.data });
  } catch (error) {
    console.error('Failed to update card:', error);
    return noCacheResponse(
      { error: 'Internal Server Error', message: 'Failed to update card' },
      500
    );
  }
}

/**
 * DELETE /api/admin/cards/[id]
 * Delete a card (soft delete by default, hard delete with ?hard=true)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    const result = hardDelete
      ? await deleteCard(id)
      : await deactivateCard(id);

    if (!result.success) {
      const status = result.error?.includes('not found') ? 404 : 400;
      return noCacheResponse(
        { error: status === 404 ? 'Not Found' : 'Error', message: result.error },
        status
      );
    }

    return noCacheResponse({
      success: true,
      message: hardDelete
        ? `Card "${id}" permanently deleted`
        : `Card "${id}" deactivated`,
    });
  } catch (error) {
    console.error('Failed to delete card:', error);
    return noCacheResponse(
      { error: 'Internal Server Error', message: 'Failed to delete card' },
      500
    );
  }
}
