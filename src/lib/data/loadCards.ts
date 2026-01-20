/**
 * Card data loader with validation
 */

import type { CreditCard } from '@/types';
import cardsData from '@/data/cards.json';

/**
 * Card database structure
 */
interface CardDatabase {
  cards: CreditCard[];
  lastUpdated: string;
  version: string;
  metadata?: {
    totalCards: number;
    dataSource: string;
    nextReviewDate: string;
  };
}

/**
 * Validate a single credit card object
 */
function validateCard(card: any): card is CreditCard {
  if (!card.id || typeof card.id !== 'string') {
    console.warn(`Invalid card: missing or invalid id`);
    return false;
  }

  if (!card.name || typeof card.name !== 'string') {
    console.warn(`Invalid card ${card.id}: missing or invalid name`);
    return false;
  }

  if (!card.issuer || typeof card.issuer !== 'string') {
    console.warn(`Invalid card ${card.id}: missing or invalid issuer`);
    return false;
  }

  if (!card.applyUrl || typeof card.applyUrl !== 'string') {
    console.warn(`Invalid card ${card.id}: missing or invalid applyUrl`);
    return false;
  }

  if (!Array.isArray(card.rewards) || card.rewards.length === 0) {
    console.warn(`Invalid card ${card.id}: rewards must be a non-empty array`);
    return false;
  }

  if (!card.fees || typeof card.fees !== 'object') {
    console.warn(`Invalid card ${card.id}: missing or invalid fees`);
    return false;
  }

  if (typeof card.fees.annualFee !== 'number') {
    console.warn(`Invalid card ${card.id}: fees.annualFee must be a number`);
    return false;
  }

  if (typeof card.isActive !== 'boolean') {
    console.warn(`Invalid card ${card.id}: isActive must be a boolean`);
    return false;
  }

  return true;
}

/**
 * Load and validate credit card data
 *
 * @returns Array of valid credit cards
 * @throws Error if data cannot be loaded
 */
export function loadCards(): CreditCard[] {
  try {
    const database = cardsData as CardDatabase;

    // Validate database structure
    if (!database.cards || !Array.isArray(database.cards)) {
      throw new Error('Invalid card database: cards must be an array');
    }

    // Filter and validate cards
    const validCards = database.cards.filter(validateCard);

    // Log validation results
    const invalidCount = database.cards.length - validCards.length;
    if (invalidCount > 0) {
      console.warn(
        `Loaded ${validCards.length} valid cards, ${invalidCount} invalid cards were skipped`
      );
    } else {
      console.log(`Successfully loaded ${validCards.length} credit cards`);
    }

    // Filter out inactive cards
    const activeCards = validCards.filter((card) => card.isActive);

    if (activeCards.length === 0) {
      console.warn('No active credit cards found in database');
    }

    return activeCards;
  } catch (error) {
    console.error('Failed to load credit card data:', error);
    throw new Error('Failed to load credit card data');
  }
}

/**
 * Get card by ID
 *
 * @param id - Card ID
 * @returns Credit card or undefined if not found
 */
export function getCardById(id: string): CreditCard | undefined {
  const cards = loadCards();
  return cards.find((card) => card.id === id);
}

/**
 * Get cards by issuer
 *
 * @param issuer - Bank/issuer name
 * @returns Array of cards from that issuer
 */
export function getCardsByIssuer(issuer: string): CreditCard[] {
  const cards = loadCards();
  return cards.filter(
    (card) => card.issuer.toLowerCase() === issuer.toLowerCase()
  );
}

/**
 * Get cards by reward unit
 *
 * @param rewardUnit - cash, miles, or points
 * @returns Array of cards offering that reward type
 */
export function getCardsByRewardUnit(
  rewardUnit: 'cash' | 'miles' | 'points'
): CreditCard[] {
  const cards = loadCards();
  return cards.filter((card) =>
    card.rewards.some((rule) => rule.rewardUnit === rewardUnit)
  );
}

/**
 * Get database metadata
 */
export function getDatabaseMetadata() {
  const database = cardsData as CardDatabase;
  return {
    lastUpdated: database.lastUpdated,
    version: database.version,
    totalCards: database.cards.length,
    activeCards: database.cards.filter((c: any) => c.isActive).length,
    ...database.metadata,
  };
}
