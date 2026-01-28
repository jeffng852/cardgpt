/**
 * Admin API: Database Statistics
 *
 * GET /api/admin/stats - Get database statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseStats } from '@/lib/data/cardRepository';
import { getPendingStats } from '@/lib/data/pendingRepository';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';

/**
 * GET /api/admin/stats
 * Get database statistics
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const stats = getDatabaseStats();
    const pendingStats = getPendingStats();
    return NextResponse.json({
      ...stats,
      pendingItems: pendingStats.total,
      pendingCards: pendingStats.cards,
      pendingRules: pendingStats.rules,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
