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
    const cardsBlob = blobs.find(b => b.pathname === CARDS_BLOB_NAME);
    return cardsBlob?.url || null;
  } catch (error) {
    console.error('Failed to list blobs:', error);
    return null;
  }
}

/**
 * Read cards data from Vercel Blob storage
 */
export async function readCardsFromBlob(): Promise<CardDatabase | null> {
  try {
    const blobUrl = await getCardsBlobUrl();

    if (!blobUrl) {
      console.log('Cards blob not found, will use local file');
      return null;
    }

    const response = await fetch(blobUrl, {
      cache: 'no-store', // Always get fresh data
    });

    if (!response.ok) {
      console.error('Failed to fetch cards blob:', response.status);
      return null;
    }

    const data = await response.json();
    return data as CardDatabase;
  } catch (error) {
    console.error('Failed to read cards from blob:', error);
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
      try {
        await del(existingUrl);
      } catch {
        // Ignore delete errors, we'll overwrite anyway
      }
    }

    // Upload new content
    await put(CARDS_BLOB_NAME, content, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log('Cards data written to blob storage');
    return true;
  } catch (error) {
    console.error('Failed to write cards to blob:', error);
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
