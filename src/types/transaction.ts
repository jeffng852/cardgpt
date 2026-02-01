/**
 * Transaction domain types
 */

import type { Currency, PaymentType } from './card';

// Re-export types for convenience
export type { Currency, PaymentType } from './card';

/**
 * Simplified transaction categories for user selection
 * Designed to cover 95%+ of HK credit card reward scenarios
 */
export type TransactionCategory =
  | 'groceries'           // Supermarkets: Wellcome, ParknShop, 759
  | 'dining'              // Restaurants, cafes, fast food
  | 'online'              // Online shopping, subscriptions (Netflix, Spotify)
  | 'travel'              // Flights, hotels, Klook, Agoda
  | 'transport'           // Local: MTR, taxi, Uber, fuel
  | 'overseas'            // Foreign currency transactions
  | 'utilities'           // CLP, Towngas, broadband, bills
  | 'financial'           // Insurance, loan payments (AIA, Prudential)
  | 'government'          // Tax, fines, license fees
  | 'digital-wallet'      // Octopus, PayMe, AlipayHK
  | 'clothing'            // Apparel, fashion: UNIQLO, Zara, H&M
  | 'others';             // Everything else

/**
 * Category display information for UI
 */
export const TRANSACTION_CATEGORIES: Record<TransactionCategory, { label: string; label_zh: string; icon: string }> = {
  groceries: { label: 'Groceries / Supermarket', label_zh: '超市/雜貨', icon: '🛒' },
  dining: { label: 'Dining', label_zh: '餐飲', icon: '🍽️' },
  online: { label: 'Online / Subscription', label_zh: '網購/訂閱', icon: '💻' },
  travel: { label: 'Travel', label_zh: '旅遊', icon: '✈️' },
  transport: { label: 'Local Transport', label_zh: '本地交通', icon: '🚇' },
  overseas: { label: 'Overseas Spending', label_zh: '海外消費', icon: '🌍' },
  utilities: { label: 'Utilities / Bills', label_zh: '水電煤/賬單', icon: '💡' },
  financial: { label: 'Financial Services', label_zh: '金融服務/保險', icon: '🏦' },
  government: { label: 'Government', label_zh: '政府', icon: '🏛️' },
  'digital-wallet': { label: 'Digital Wallet', label_zh: '電子錢包', icon: '📱' },
  clothing: { label: 'Clothing', label_zh: '衣著', icon: '👕' },
  others: { label: 'Others', label_zh: '其他', icon: '📦' },
};

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
