/**
 * Pending Items API
 *
 * GET /api/admin/pending - List all pending items
 * POST /api/admin/pending - Create a new pending item
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import {
  getAllPendingItems,
  getPendingItemsByType,
  getPendingItemsBySource,
  createPendingItem,
  getPendingStats,
  type PendingItemType,
  type PendingSource,
} from '@/lib/data/pendingRepository';

/**
 * GET /api/admin/pending
 * List all pending items with optional filters
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as PendingItemType | null;
    const source = searchParams.get('source') as PendingSource | null;
    const includeStats = searchParams.get('stats') === 'true';

    let items = getAllPendingItems();

    // Apply filters
    if (type) {
      items = items.filter(item => item.type === type);
    }
    if (source) {
      items = items.filter(item => item.source === source);
    }

    const response: {
      items: typeof items;
      count: number;
      stats?: ReturnType<typeof getPendingStats>;
    } = {
      items,
      count: items.length,
    };

    if (includeStats) {
      response.stats = getPendingStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch pending items:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch pending items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pending
 * Create a new pending item
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.changeType || !body.source) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing required fields: type, changeType, source' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['card', 'rule'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid type. Must be "card" or "rule"' },
        { status: 400 }
      );
    }

    // Validate changeType
    if (!['create', 'update', 'delete'].includes(body.changeType)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid changeType. Must be "create", "update", or "delete"' },
        { status: 400 }
      );
    }

    // Validate source
    if (!['manual', 'ai-extracted'].includes(body.source)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid source. Must be "manual" or "ai-extracted"' },
        { status: 400 }
      );
    }

    const newItem = createPendingItem({
      type: body.type,
      changeType: body.changeType,
      source: body.source,
      cardId: body.cardId,
      cardData: body.cardData,
      ruleIndex: body.ruleIndex,
      ruleData: body.ruleData,
      originalData: body.originalData,
      notes: body.notes,
      sourceUrl: body.sourceUrl,
    });

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Failed to create pending item:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create pending item' },
      { status: 500 }
    );
  }
}
