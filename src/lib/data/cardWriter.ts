/**
 * Card Writer - Server-side write operations for card data
 *
 * IMPORTANT: This module should only be used in:
 * - API routes (server-side)
 * - Server components
 *
 * Write Flow:
 * 1. Read current cards.json
 * 2. Validate the changes
 * 3. Write updated data back to cards.json
 * 4. For production: Commit to Git → Vercel auto-deploys
 */

import fs from 'fs/promises';
import path from 'path';
import type { CreditCard } from '@/types/card';
import { validateCard, cardIdExists, getDatabase } from './cardRepository';
import type { CardDatabase } from './cardRepository';

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
 * Read the cards.json file directly (bypassing import cache)
 */
async function readCardsFile(): Promise<CardDatabase> {
  const content = await fs.readFile(CARDS_FILE_PATH, 'utf-8');
  return JSON.parse(content) as CardDatabase;
}

/**
 * Write the cards.json file
 */
async function writeCardsFile(database: CardDatabase): Promise<void> {
  // Update lastUpdated timestamp
  database.lastUpdated = new Date().toISOString();

  // Update metadata
  if (database.metadata) {
    database.metadata.totalCards = database.cards.length;
  }

  const content = JSON.stringify(database, null, 2) + '\n';
  await fs.writeFile(CARDS_FILE_PATH, content, 'utf-8');
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
    if (cardIdExists(card.id)) {
      return { success: false, error: `Card with ID "${card.id}" already exists` };
    }

    // Read current data
    const database = await readCardsFile();

    // Add the new card
    database.cards.push(card);

    // Write back
    await writeCardsFile(database);

    return { success: true, data: card };
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
    const database = await readCardsFile();

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

    // Write back
    await writeCardsFile(database);

    return { success: true, data: updatedCard };
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
    const database = await readCardsFile();

    // Find the card
    const cardIndex = database.cards.findIndex(c => c.id === id);
    if (cardIndex === -1) {
      return { success: false, error: `Card with ID "${id}" not found` };
    }

    // Remove the card
    database.cards.splice(cardIndex, 1);

    // Write back
    await writeCardsFile(database);

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
    const database = await readCardsFile();
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
    await writeCardsFile(database);

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
    const database = await readCardsFile();

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
    await writeCardsFile(database);

    return { success: true, data: null };
  } catch (error) {
    console.error('Failed to reorder cards:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
