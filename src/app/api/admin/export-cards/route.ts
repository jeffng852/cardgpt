/**
 * Admin API: Export Cards Data
 *
 * GET /api/admin/export-cards
 * Downloads the current cards data from Redis as JSON
 *
 * Use this to sync production data back to your local cards.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import { getDatabaseAsync } from '@/lib/data/cardRepository';

export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const database = await getDatabaseAsync();

    // Return as downloadable JSON file
    const content = JSON.stringify(database, null, 2);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="cards.json"',
      },
    });
  } catch (error) {
    console.error('Failed to export cards:', error);
    return NextResponse.json(
      {
        error: 'Export Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
