/**
 * Vercel Blob Storage for Card Data
 *
 * This module provides read/write access to card data stored in Vercel Blob.
 * Used in production where the filesystem is read-only.
 *
 * Setup:
 * 1. Create a Vercel Blob store in your Vercel dashboard
 * 2. Add BLOB_READ_WRITE_TOKEN to your environment variables
 * 3. Run the init script to upload initial cards.json to blob
 */

import { put, list, del, head } from '@vercel/blob';
import type { CardDatabase } from './cardRepository';

const CARDS_BLOB_NAME = 'cards.json';

// Module-level cache for the last known blob URL (helps with consistency)
let lastKnownBlobUrl: string | null = null;

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
 * Get the URL of the cards blob if it exists
 * Uses cached URL first, then falls back to list()
 */
async function getCardsBlobUrl(): Promise<string | null> {
  // Try cached URL first (faster and more consistent)
  if (lastKnownBlobUrl) {
    try {
      const headResult = await head(lastKnownBlobUrl);
      if (headResult) {
        console.log(`[Blob] Using cached URL: ${lastKnownBlobUrl}`);
        return lastKnownBlobUrl;
      }
    } catch {
      console.log('[Blob] Cached URL no longer valid, falling back to list()');
      lastKnownBlobUrl = null;
    }
  }

  try {
    // List ALL blobs (prefix filter appears unreliable)
    const { blobs } = await list();

    console.log(`[Blob] Listed ${blobs.length} total blobs`);

    // Find by exact pathname match
    const cardsBlob = blobs.find(b => b.pathname === CARDS_BLOB_NAME);

    if (!cardsBlob) {
      console.log(`[Blob] No blob found with pathname "${CARDS_BLOB_NAME}"`);
      return null;
    }

    // Cache the URL for future use
    lastKnownBlobUrl = cardsBlob.url;
    console.log(`[Blob] Found cards blob - URL: ${cardsBlob.url}`);
    return cardsBlob.url;
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
    // Add cache-busting query param to bypass CDN caching
    const cacheBustUrl = `${blobUrl}?t=${Date.now()}&r=${Math.random()}`;
    console.log(`[Blob] Fetching blob data from: ${blobUrl}`);

    const response = await fetch(cacheBustUrl, {
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
 */
export async function readCardsFromBlob(): Promise<CardDatabase | null> {
  try {
    console.log('[Blob] Attempting to read cards from blob storage...');

    const blobUrl = await getCardsBlobUrl();

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
 * Returns the written data for immediate use (avoids read-after-write consistency issues)
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

    console.log(`[Blob] Writing blob with timestamp: ${writeTimestamp}`);

    // Upload new content (overwrites existing with same pathname when addRandomSuffix: false)
    const result = await put(CARDS_BLOB_NAME, content, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log(`[Blob] Blob written successfully - URL: ${result.url}`);

    // Update cached URL immediately
    lastKnownBlobUrl = result.url;

    // Verify the write by reading back from the NEW URL
    console.log('[Blob] Verifying write...');
    const verifyData = await fetchBlobData(result.url);

    if (!verifyData) {
      console.error('[Blob] Write verification failed - could not read back data');
      return { success: false };
    }

    if (verifyData.lastUpdated !== writeTimestamp) {
      console.error(`[Blob] Write verification failed - timestamp mismatch. Expected: ${writeTimestamp}, Got: ${verifyData.lastUpdated}`);
      return { success: false };
    }

    console.log(`[Blob] Write verified successfully - lastUpdated: ${verifyData.lastUpdated}`);

    // Clean up old blobs with the same pathname (there might be duplicates)
    try {
      const { blobs } = await list();
      const oldBlobs = blobs.filter(b => b.pathname === CARDS_BLOB_NAME && b.url !== result.url);
      for (const oldBlob of oldBlobs) {
        console.log(`[Blob] Cleaning up old blob: ${oldBlob.url}`);
        await del(oldBlob.url);
      }
    } catch (cleanupError) {
      console.warn('[Blob] Failed to clean up old blobs:', cleanupError);
      // Don't fail the write operation if cleanup fails
    }

    return { success: true, data: verifyData, url: result.url };
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
  return writeCardsToBlob(localData);
}

/**
 * List all blobs in the store (for debugging)
 */
export async function listAllBlobs(): Promise<{ pathname: string; url: string; size: number }[]> {
  try {
    const { blobs } = await list();
    return blobs.map(b => ({
      pathname: b.pathname,
      url: b.url,
      size: b.size,
    }));
  } catch (error) {
    console.error('[Blob] Failed to list all blobs:', error);
    return [];
  }
}
