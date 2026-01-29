/**
 * Card Repository - Data access layer for credit card operations
 *
 * Design:
 * - Read operations: Direct JSON import (fast, cached by Next.js)
 * - Write operations: Via API routes that update the JSON file
 * - Production updates: Commit changes to Git, Vercel auto-deploys
 */

import type { CreditCard, RewardRule } from '@/types/card';
import cardsData from '@/data/cards.json';

/**
 * Card database structure (matches cards.json schema)
 */
export interface CardDatabase {
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
 * Result type for write operations
 */
export interface WriteResult {
  success: boolean;
  error?: string;
  card?: CreditCard;
}

/**
 * Get the full database
 */
export function getDatabase(): CardDatabase {
  return cardsData as CardDatabase;
}

/**
 * Get all cards (including inactive for admin)
 */
export function getAllCards(): CreditCard[] {
  const db = getDatabase();
  return db.cards;
}

/**
 * Get only active cards (for public-facing features)
 */
export function getActiveCards(): CreditCard[] {
  return getAllCards().filter(card => card.isActive);
}

/**
 * Get card by ID
 */
export function getCardById(id: string): CreditCard | undefined {
  return getAllCards().find(card => card.id === id);
}

/**
 * Validate a credit card object
 * Returns array of validation errors (empty if valid)
 */
export function validateCard(card: Partial<CreditCard>): string[] {
  const errors: string[] = [];

  if (!card.id || typeof card.id !== 'string' || card.id.trim() === '') {
    errors.push('ID is required and must be a non-empty string');
  }

  if (!card.name || typeof card.name !== 'string' || card.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!card.issuer || typeof card.issuer !== 'string' || card.issuer.trim() === '') {
    errors.push('Issuer is required and must be a non-empty string');
  }

  // applyUrl is optional, but if provided must be a valid URL
  if (card.applyUrl && typeof card.applyUrl === 'string' && card.applyUrl.trim() !== '') {
    if (!isValidUrl(card.applyUrl)) {
      errors.push('Apply URL must be a valid URL');
    }
  }

  if (!Array.isArray(card.rewards)) {
    errors.push('Rewards must be an array');
  } else if (card.rewards.length === 0) {
    errors.push('At least one reward rule is required');
  } else {
    // Validate each reward rule
    card.rewards.forEach((rule, index) => {
      const ruleErrors = validateRewardRule(rule);
      ruleErrors.forEach(err => errors.push(`Reward rule ${index + 1}: ${err}`));
    });
  }

  if (!card.fees || typeof card.fees !== 'object') {
    errors.push('Fees structure is required');
  } else if (typeof card.fees.annualFee !== 'number') {
    errors.push('Annual fee must be a number');
  }

  if (typeof card.isActive !== 'boolean') {
    errors.push('isActive must be a boolean');
  }

  return errors;
}

/**
 * Validate a reward rule
 */
export function validateRewardRule(rule: Partial<RewardRule>): string[] {
  const errors: string[] = [];

  if (!rule.id || typeof rule.id !== 'string') {
    errors.push('Rule ID is required');
  }

  if (typeof rule.rewardRate !== 'number' || rule.rewardRate < 0) {
    errors.push('Reward rate must be a non-negative number');
  }

  if (!rule.rewardUnit || !['cash', 'miles', 'points'].includes(rule.rewardUnit)) {
    errors.push('Reward unit must be cash, miles, or points');
  }

  if (!rule.priority || !['base', 'bonus', 'specific'].includes(rule.priority)) {
    errors.push('Priority must be base, bonus, or specific');
  }

  if (typeof rule.isPromotional !== 'boolean') {
    errors.push('isPromotional must be a boolean');
  }

  if (!rule.description || typeof rule.description !== 'string') {
    errors.push('Description is required');
  }

  // Must have at least one of: categories, specificMerchants, or merchantTypes
  if (!rule.categories && !rule.specificMerchants && !rule.merchantTypes) {
    errors.push('Must specify categories, specificMerchants, or merchantTypes');
  }

  // Validate date formats if present
  if (rule.validFrom && !isValidDateString(rule.validFrom)) {
    errors.push('validFrom must be in YYYY-MM-DD format');
  }

  if (rule.validUntil && !isValidDateString(rule.validUntil)) {
    errors.push('validUntil must be in YYYY-MM-DD format');
  }

  return errors;
}

/**
 * Generate a URL-safe ID from card name
 */
export function generateCardId(name: string, issuer: string): string {
  const base = `${issuer}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return base;
}

/**
 * Generate a unique reward rule ID
 */
export function generateRuleId(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

/**
 * Check if a card ID already exists
 */
export function cardIdExists(id: string): boolean {
  return getAllCards().some(card => card.id === id);
}

/**
 * Helper: Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  const cards = getAllCards();
  const activeCards = cards.filter(c => c.isActive);

  const issuers = new Set(cards.map(c => c.issuer));
  const rewardTypes = new Set<string>();
  let totalRules = 0;
  let promotionalRules = 0;

  cards.forEach(card => {
    card.rewards.forEach(rule => {
      totalRules++;
      rewardTypes.add(rule.rewardUnit);
      if (rule.isPromotional) promotionalRules++;
    });
  });

  return {
    totalCards: cards.length,
    activeCards: activeCards.length,
    inactiveCards: cards.length - activeCards.length,
    issuers: Array.from(issuers),
    issuerCount: issuers.size,
    rewardTypes: Array.from(rewardTypes),
    totalRewardRules: totalRules,
    promotionalRules,
    lastUpdated: getDatabase().lastUpdated,
    version: getDatabase().version,
  };
}
