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

import { put, list, del } from '@vercel/blob';
import type { CardDatabase } from './cardRepository';

const CARDS_BLOB_NAME = 'cards.json';

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
 */
async function getCardsBlobUrl(): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: CARDS_BLOB_NAME });

    // Debug: log what blobs we found
    console.log(`[Blob] Listed ${blobs.length} blobs with prefix "${CARDS_BLOB_NAME}":`,
      blobs.map(b => ({ pathname: b.pathname, url: b.url.substring(0, 50) + '...' }))
    );

    // Try exact match first
    let cardsBlob = blobs.find(b => b.pathname === CARDS_BLOB_NAME);

    // If not found, try matching just the filename (in case there's a folder prefix)
    if (!cardsBlob) {
      cardsBlob = blobs.find(b => b.pathname.endsWith(CARDS_BLOB_NAME));
      if (cardsBlob) {
        console.log(`[Blob] Found blob with pathname "${cardsBlob.pathname}" (partial match)`);
      }
    }

    if (!cardsBlob) {
      console.log(`[Blob] No blob found matching "${CARDS_BLOB_NAME}"`);
      return null;
    }

    console.log(`[Blob] Using blob URL: ${cardsBlob.url}`);
    return cardsBlob.url;
  } catch (error) {
    console.error('[Blob] Failed to list blobs:', error);
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

    // Add cache-busting query param to bypass CDN caching
    const cacheBustUrl = `${blobUrl}?t=${Date.now()}`;
    console.log(`[Blob] Fetching blob data from: ${cacheBustUrl}`);
    const response = await fetch(cacheBustUrl, {
      cache: 'no-store', // Always get fresh data
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error(`[Blob] Failed to fetch cards blob: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`[Blob] Successfully read ${data.cards?.length || 0} cards from blob storage`);
    return data as CardDatabase;
  } catch (error) {
    console.error('[Blob] Failed to read cards from blob:', error);
    return null;
  }
}

/**
 * Write cards data to Vercel Blob storage
 */
export async function writeCardsToBlob(database: CardDatabase): Promise<boolean> {
  try {
    // Update lastUpdated timestamp
    database.lastUpdated = new Date().toISOString();

    // Update metadata
    if (database.metadata) {
      database.metadata.totalCards = database.cards.length;
    }

    const content = JSON.stringify(database, null, 2);

    // Delete existing blob if it exists (put with same name creates a new one)
    const existingUrl = await getCardsBlobUrl();
    if (existingUrl) {
      console.log(`[Blob] Deleting existing blob: ${existingUrl}`);
      try {
        await del(existingUrl);
        console.log('[Blob] Existing blob deleted');
      } catch (delError) {
        console.warn('[Blob] Failed to delete existing blob (continuing anyway):', delError);
      }
    }

    // Upload new content
    console.log(`[Blob] Uploading new blob with pathname "${CARDS_BLOB_NAME}"...`);
    const result = await put(CARDS_BLOB_NAME, content, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log(`[Blob] Cards data written to blob storage successfully`);
    console.log(`[Blob] New blob URL: ${result.url}`);
    console.log(`[Blob] New blob pathname: ${result.pathname}`);
    return true;
  } catch (error) {
    console.error('[Blob] Failed to write cards to blob:', error);
    return false;
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
