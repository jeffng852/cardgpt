/**
 * Transaction domain types
 */

import type { Currency, PaymentType } from './card';

/**
 * Parsed transaction from user input
 */
export interface Transaction {
  /** Transaction amount */
  amount: number;

  /** Currency code */
  currency: Currency;

  /** Broad merchant category (e.g., 'dining', 'retail', 'travel') */
  category?: string;

  /** Specific merchant identifier (e.g., 'mcdonalds', 'sushiro') */
  merchantId?: string;

  /**
   * @deprecated Use category and/or merchantId instead
   * Kept for backward compatibility during migration
   */
  merchantType?: string;

  /** Payment type */
  paymentType: PaymentType;

  /** Transaction location (country/region for geographic restrictions) */
  location?: string;

  /** Transaction date (optional, defaults to current date) */
  date?: Date;

  /** Day of week (derived from date) */
  dayOfWeek?: string;

  /** Raw user input for debugging */
  rawInput?: string;

  /** Confidence score for category/merchant detection (0-1) */
  merchantTypeConfidence?: number;
}

/**
 * User preferences for card recommendations
 */
export interface UserPreferences {
  /** Preferred reward types in priority order */
  preferredRewardTypes?: ('cash' | 'miles' | 'points')[];

  /** Preferred issuers */
  preferredIssuers?: string[];

  /** Cards to exclude from recommendations */
  excludedCardIds?: string[];
}
