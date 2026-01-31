/**
 * Vercel Blob Storage for Card Data
 *
 * This module provides read/write access to card data stored in Vercel Blob.
 * Used in production where the filesystem is read-only.
 *
 * Strategy: Use addRandomSuffix to create unique URLs per write.
 * This bypasses CDN caching issues because each write goes to a fresh URL.
 *
 * Setup:
 * 1. Create a Vercel Blob store in your Vercel dashboard
 * 2. Add BLOB_READ_WRITE_TOKEN to your environment variables
 * 3. Run the init script to upload initial cards.json to blob
 */

import { put, list, del } from '@vercel/blob';
import type { CardDatabase } from './cardRepository';

const CARDS_BLOB_PREFIX = 'cards';

/**
 * Check if we're in a Vercel production environment
 * (filesystem is read-only in production)
 */
export function isProductionEnvironment(): boolean {
  return process.env.VERCEL === '1' && process.env.NODE_ENV === 'production';
}

/**
 * Check if blob storage is configured
 */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Find the most recent cards blob by uploadedAt timestamp
 */
async function getLatestCardsBlobUrl(): Promise<string | null> {
  try {
    const { blobs } = await list();

    // Filter to cards blobs only (pathname starts with 'cards')
    const cardsBlobs = blobs.filter(b =>
      b.pathname.startsWith(CARDS_BLOB_PREFIX) && b.pathname.endsWith('.json')
    );

    console.log(`[Blob] Found ${cardsBlobs.length} cards blobs`);

    if (cardsBlobs.length === 0) {
      console.log('[Blob] No cards blobs found');
      return null;
    }

    // Sort by uploadedAt descending to get the most recent
    cardsBlobs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const latestBlob = cardsBlobs[0];
    console.log(`[Blob] Latest blob: ${latestBlob.pathname} (uploaded: ${latestBlob.uploadedAt})`);

    return latestBlob.url;
  } catch (error) {
    console.error('[Blob] Failed to list blobs:', error);
    return null;
  }
}

/**
 * Read cards data directly from a specific URL
 */
async function fetchBlobData(blobUrl: string): Promise<CardDatabase | null> {
  try {
    console.log(`[Blob] Fetching blob data from: ${blobUrl}`);

    const response = await fetch(blobUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`[Blob] Failed to fetch blob: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data as CardDatabase;
  } catch (error) {
    console.error('[Blob] Failed to fetch blob data:', error);
    return null;
  }
}

/**
 * Read cards data from Vercel Blob storage
 * Finds the most recently uploaded cards blob
 */
export async function readCardsFromBlob(): Promise<CardDatabase | null> {
  try {
    console.log('[Blob] Attempting to read cards from blob storage...');

    const blobUrl = await getLatestCardsBlobUrl();

    if (!blobUrl) {
      console.log('[Blob] Cards blob not found, will use local file');
      return null;
    }

    const data = await fetchBlobData(blobUrl);
    if (data) {
      console.log(`[Blob] Successfully read ${data.cards?.length || 0} cards, lastUpdated: ${data.lastUpdated}`);
    }
    return data;
  } catch (error) {
    console.error('[Blob] Failed to read cards from blob:', error);
    return null;
  }
}

/**
 * Write cards data to Vercel Blob storage
 * Creates a new blob with unique URL each time to bypass CDN caching
 * Returns the written data for immediate use
 */
export async function writeCardsToBlob(database: CardDatabase): Promise<{ success: boolean; data?: CardDatabase; url?: string }> {
  try {
    // Update lastUpdated timestamp
    const writeTimestamp = new Date().toISOString();
    database.lastUpdated = writeTimestamp;

    // Update metadata
    if (database.metadata) {
      database.metadata.totalCards = database.cards.length;
    }

    const content = JSON.stringify(database, null, 2);

    console.log(`[Blob] Writing new blob with timestamp: ${writeTimestamp}`);

    // Create new blob with random suffix - creates unique URL each time
    // This bypasses CDN caching because each write goes to a fresh URL
    const result = await put(`${CARDS_BLOB_PREFIX}.json`, content, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
    });

    console.log(`[Blob] Blob written successfully - URL: ${result.url}`);

    // Clean up old blobs (keep only the one we just created)
    try {
      const { blobs } = await list();
      const oldBlobs = blobs.filter(b =>
        b.pathname.startsWith(CARDS_BLOB_PREFIX) &&
        b.pathname.endsWith('.json') &&
        b.url !== result.url
      );

      if (oldBlobs.length > 0) {
        console.log(`[Blob] Cleaning up ${oldBlobs.length} old blob(s)`);
        for (const oldBlob of oldBlobs) {
          await del(oldBlob.url);
          console.log(`[Blob] Deleted old blob: ${oldBlob.pathname}`);
        }
      }
    } catch (cleanupError) {
      console.warn('[Blob] Failed to clean up old blobs:', cleanupError);
      // Don't fail the write operation if cleanup fails
    }

    // Return the database we wrote (deep clone to avoid mutation issues)
    const writtenData: CardDatabase = JSON.parse(content);
    console.log(`[Blob] Write complete - returning written data with timestamp: ${writeTimestamp}`);

    return { success: true, data: writtenData, url: result.url };
  } catch (error) {
    console.error('[Blob] Failed to write cards to blob:', error);
    return { success: false };
  }
}

/**
 * Initialize blob storage with data from local cards.json
 * Call this once to set up the blob with your initial data
 */
export async function initializeBlobFromLocal(localData: CardDatabase): Promise<boolean> {
  console.log('Initializing blob storage with local cards.json data...');
  const result = await writeCardsToBlob(localData);
  return result.success;
}

/**
 * List all blobs in the store (for debugging)
 */
export async function listAllBlobs(): Promise<{ pathname: string; url: string; size: number; uploadedAt: Date }[]> {
  try {
    const { blobs } = await list();
    return blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));
  } catch (error) {
    console.error('[Blob] Failed to list blobs:', error);
    return [];
  }
}
