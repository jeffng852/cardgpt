/**
 * Admin API: Initialize Blob Storage
 *
 * POST /api/admin/init-blob
 * Uploads the current cards.json to Vercel Blob storage
 *
 * This endpoint should be called once after deploying to production
 * to initialize the blob storage with your existing card data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedFromRequest, unauthorizedResponse } from '@/lib/auth/adminAuth';
import { getDatabase } from '@/lib/data/cardRepository';
import { writeCardsToBlob, isBlobConfigured, readCardsFromBlob, listAllBlobs, isProductionEnvironment } from '@/lib/data/blobStorage';

export async function POST(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    // Check if blob storage is configured
    if (!isBlobConfigured()) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: 'BLOB_READ_WRITE_TOKEN environment variable is not set',
        },
        { status: 500 }
      );
    }

    // Get current database from static import
    const database = getDatabase();

    // Upload to blob
    const success = await writeCardsToBlob(database);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Upload Failed',
          message: 'Failed to upload cards data to blob storage',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cards data uploaded to blob storage successfully',
      stats: {
        totalCards: database.cards.length,
        activeCards: database.cards.filter(c => c.isActive).length,
        lastUpdated: database.lastUpdated,
        version: database.version,
      },
    });
  } catch (error) {
    console.error('Failed to initialize blob storage:', error);
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
 * GET /api/admin/init-blob
 * Check blob storage status
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticatedFromRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const blobConfigured = isBlobConfigured();

    if (!blobConfigured) {
      return NextResponse.json({
        blobConfigured: false,
        message: 'BLOB_READ_WRITE_TOKEN is not configured',
      });
    }

    // List all blobs for debugging
    const allBlobs = await listAllBlobs();

    // Try to read from blob
    const blobData = await readCardsFromBlob();

    if (!blobData) {
      return NextResponse.json({
        blobConfigured: true,
        blobInitialized: false,
        message: 'Blob storage is configured but no cards data found. Run POST to initialize.',
        debug: {
          allBlobsInStore: allBlobs,
          environment: {
            isProductionEnvironment: isProductionEnvironment(),
            VERCEL: process.env.VERCEL,
            NODE_ENV: process.env.NODE_ENV,
            VERCEL_ENV: process.env.VERCEL_ENV,
          },
        },
      });
    }

    return NextResponse.json({
      blobConfigured: true,
      blobInitialized: true,
      stats: {
        totalCards: blobData.cards.length,
        activeCards: blobData.cards.filter(c => c.isActive).length,
        lastUpdated: blobData.lastUpdated,
        version: blobData.version,
      },
      debug: {
        allBlobsInStore: allBlobs,
        environment: {
          isProductionEnvironment: isProductionEnvironment(),
          VERCEL: process.env.VERCEL,
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
        },
      },
    });
  } catch (error) {
    console.error('Failed to check blob status:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
