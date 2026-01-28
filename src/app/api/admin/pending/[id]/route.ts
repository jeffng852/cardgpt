/**
 * Single Pending Item API
 *
 * GET /api/admin/pending/[id] - Get a single pending item
 * PUT /api/admin/pending/[id] - Update a pending item
 * DELETE /api/admin/pending/[id] - Delete (reject) a pending item
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import {
  getPendingItemById,
  updatePendingItem,
  deletePendingItem,
} from '@/lib/data/pendingRepository';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/pending/[id]
 * Get a single pending item
 */
export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const item = getPendingItemById(id);

    if (!item) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Pending item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Failed to fetch pending item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch pending item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/pending/[id]
 * Update a pending item
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    const updatedItem = updatePendingItem(id, {
      cardData: body.cardData,
      ruleData: body.ruleData,
      notes: body.notes,
      sourceUrl: body.sourceUrl,
    });

    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Pending item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Failed to update pending item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update pending item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/pending/[id]
 * Reject a pending item
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await context.params;
    const deleted = deletePendingItem(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Pending item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Pending item rejected and removed' });
  } catch (error) {
    console.error('Failed to reject pending item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to reject pending item' },
      { status: 500 }
    );
  }
}
