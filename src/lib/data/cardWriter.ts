/**
 * Card Writer - Server-side write operations for card data
 *
 * IMPORTANT: This module should only be used in:
 * - API routes (server-side)
 * - Server components
 *
 * Write Flow:
 * - Development: Direct file system writes to cards.json
 * - Production: Vercel Blob storage (filesystem is read-only)
 */

import fs from 'fs/promises';
import path from 'path';
import type { CreditCard } from '@/types/card';
import { validateCard } from './cardRepository';
import type { CardDatabase } from './cardRepository';
import {
  isProductionEnvironment,
  isBlobConfigured,
  readCardsFromBlob,
  writeCardsToBlob,
} from './blobStorage';

const CARDS_FILE_PATH = path.join(process.cwd(), 'src/data/cards.json');

/**
 * Write result type
 */
export interface WriteResult<T = CreditCard> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: string[];
}

/**
 * Read the cards database (from blob in production, file in development)
 */
async function readCardsData(): Promise<CardDatabase> {
  const isProd = isProductionEnvironment();
  const blobConfigured = isBlobConfigured();

  console.log(`[CardWriter] readCardsData called - isProd: ${isProd}, blobConfigured: ${blobConfigured}`);

  // In production, try to read from blob storage
  if (isProd) {
    if (!blobConfigured) {
      // Blob not configured - warn but fall back to static file
      console.warn(
        '[CardWriter] BLOB_READ_WRITE_TOKEN not configured in production. ' +
        'Reading from static deployment file. Saves will fail.'
      );
    } else {
      console.log('[CardWriter] Attempting to read from blob for save operation...');
      const blobData = await readCardsFromBlob();
      if (blobData) {
        console.log(`[CardWriter] Read from blob for save - lastUpdated: ${blobData.lastUpdated}, cards: ${blobData.cards.length}`);
        return blobData;
      }
      // Fall through to file read if blob fails
      console.warn('[CardWriter] Blob read FAILED, falling back to local file');
    }
  }

  // Read from local file (development, or production fallback)
  console.log('[CardWriter] Reading from local file...');
  const content = await fs.readFile(CARDS_FILE_PATH, 'utf-8');
  const data = JSON.parse(content) as CardDatabase;
  console.log(`[CardWriter] Read from LOCAL FILE - lastUpdated: ${data.lastUpdated}, cards: ${data.cards.length}`);
  return data;
}

/**
 * Write the cards database (to blob in production, file in development)
 * Returns the verified written data in production for immediate use
 */
async function writeCardsData(database: CardDatabase): Promise<CardDatabase> {
  // In production, MUST use blob storage (filesystem is read-only/ephemeral)
  if (isProductionEnvironment()) {
    if (!isBlobConfigured()) {
      throw new Error(
        'Cannot save changes: BLOB_READ_WRITE_TOKEN is not configured. ' +
        'Please add this environment variable in your Vercel project settings.'
      );
    }

    const result = await writeCardsToBlob(database);
    if (!result.success || !result.data) {
      throw new Error('Failed to write cards to blob storage - verification failed');
    }

    console.log(`[CardWriter] Write verified - lastUpdated: ${result.data.lastUpdated}`);
    return result.data; // Return verified data
  }

  // Development: Update timestamps and write to local file
  database.lastUpdated = new Date().toISOString();
  if (database.metadata) {
    database.metadata.totalCards = database.cards.length;
  }

  const content = JSON.stringify(database, null, 2) + '\n';
  await fs.writeFile(CARDS_FILE_PATH, content, 'utf-8');
  return database;
}

/**
 * Check if a card ID exists in the database
 */
async function cardIdExistsInDb(id: string): Promise<boolean> {
  const database = await readCardsData();
  return database.cards.some(card => card.id === id);
}

/**
 * Create a new credit card
 */
export async function createCard(card: CreditCard): Promise<WriteResult> {
  try {
    // Validate the card
    const validationErrors = validateCard(card);
    if (validationErrors.length > 0) {
      return { success: false, validationErrors };
    }

    // Check for duplicate ID
    if (await cardIdExistsInDb(card.id)) {
      return { success: false, error: `Card with ID "${card.id}" already exists` };
    }

    // Read current data
    const database = await readCardsData();

    // Add the new card
    database.cards.push(card);

    // Write back and get verified data
    const verifiedDatabase = await writeCardsData(database);

    // Return the verified card from the written database
    const verifiedCard = verifiedDatabase.cards.find(c => c.id === card.id);
    if (!verifiedCard) {
      throw new Error('Card not found in verified database after write');
    }

    console.log(`[CardWriter] Create verified for card ${card.id} - lastUpdated: ${verifiedCard.lastUpdated}`);
    return { success: true, data: verifiedCard };
  } catch (error) {
    console.error('Failed to create card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing credit card
 */
export async function updateCard(
  id: string,
  updates: Partial<CreditCard>
): Promise<WriteResult> {
  try {
    // Read current data
    const database = await readCardsData();

    // Find the card
    const cardIndex = database.cards.findIndex(c => c.id === id);
    if (cardIndex === -1) {
      return { success: false, error: `Card with ID "${id}" not found` };
    }

    // Merge updates
    const existingCard = database.cards[cardIndex];
    const updatedCard: CreditCard = {
      ...existingCard,
      ...updates,
      id: existingCard.id, // Prevent ID change
      lastUpdated: new Date().toISOString(),
    };

    // Validate the updated card
    const validationErrors = validateCard(updatedCard);
    if (validationErrors.length > 0) {
      return { success: false, validationErrors };
    }

    // Update in place
    database.cards[cardIndex] = updatedCard;

    // Write back and get verified data
    const verifiedDatabase = await writeCardsData(database);

    // Return the verified card from the written database
    const verifiedCard = verifiedDatabase.cards.find(c => c.id === id);
    if (!verifiedCard) {
      throw new Error('Card not found in verified database after write');
    }

    console.log(`[CardWriter] Update verified for card ${id} - lastUpdated: ${verifiedCard.lastUpdated}`);
    return { success: true, data: verifiedCard };
  } catch (error) {
    console.error('Failed to update card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a credit card (soft delete by setting isActive = false)
 */
export async function deactivateCard(id: string): Promise<WriteResult> {
  return updateCard(id, { isActive: false });
}

/**
 * Permanently delete a credit card
 * Use with caution - prefer deactivateCard for soft deletes
 */
export async function deleteCard(id: string): Promise<WriteResult<null>> {
  try {
    // Read current data
    const database = await readCardsData();

    // Find the card
    const cardIndex = database.cards.findIndex(c => c.id === id);
    if (cardIndex === -1) {
      return { success: false, error: `Card with ID "${id}" not found` };
    }

    // Remove the card
    database.cards.splice(cardIndex, 1);

    // Write back
    await writeCardsData(database);

    return { success: true, data: null };
  } catch (error) {
    console.error('Failed to delete card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Bulk update multiple cards
 */
export async function bulkUpdateCards(
  updates: Array<{ id: string; updates: Partial<CreditCard> }>
): Promise<WriteResult<CreditCard[]>> {
  try {
    // Read current data
    const database = await readCardsData();
    const updatedCards: CreditCard[] = [];
    const errors: string[] = [];

    for (const { id, updates: cardUpdates } of updates) {
      const cardIndex = database.cards.findIndex(c => c.id === id);
      if (cardIndex === -1) {
        errors.push(`Card "${id}" not found`);
        continue;
      }

      const existingCard = database.cards[cardIndex];
      const updatedCard: CreditCard = {
        ...existingCard,
        ...cardUpdates,
        id: existingCard.id,
        lastUpdated: new Date().toISOString(),
      };

      const validationErrors = validateCard(updatedCard);
      if (validationErrors.length > 0) {
        errors.push(`Card "${id}": ${validationErrors.join(', ')}`);
        continue;
      }

      database.cards[cardIndex] = updatedCard;
      updatedCards.push(updatedCard);
    }

    if (errors.length > 0 && updatedCards.length === 0) {
      return { success: false, error: errors.join('; ') };
    }

    // Write back
    await writeCardsData(database);

    return {
      success: true,
      data: updatedCards,
      error: errors.length > 0 ? `Partial success: ${errors.join('; ')}` : undefined,
    };
  } catch (error) {
    console.error('Failed to bulk update cards:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reorder cards in the database
 */
export async function reorderCards(cardIds: string[]): Promise<WriteResult<null>> {
  try {
    const database = await readCardsData();

    // Create a map of existing cards
    const cardMap = new Map(database.cards.map(c => [c.id, c]));

    // Reorder based on provided IDs
    const reorderedCards: CreditCard[] = [];
    for (const id of cardIds) {
      const card = cardMap.get(id);
      if (card) {
        reorderedCards.push(card);
        cardMap.delete(id);
      }
    }

    // Append any cards not in the reorder list
    for (const card of cardMap.values()) {
      reorderedCards.push(card);
    }

    database.cards = reorderedCards;
    await writeCardsData(database);

    return { success: true, data: null };
  } catch (error) {
    console.error('Failed to reorder cards:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
