/**
 * Credit Card domain types
 * Based on CardGPT PRD requirements
 * Enhanced to support complex reward structures like Citi Cash Back Card
 */

/** Supported reward units */
export type RewardUnit = 'cash' | 'miles' | 'points';

/** Payment types */
export type PaymentType = 'online' | 'offline';

/** Currency codes */
export type Currency = 'HKD' | 'USD' | 'CNY' | 'JPY' | 'EUR' | 'GBP' | 'SGD' | 'AUD' | 'CAD';

/** Day of week for special promotions */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Geographic restrictions
 */
export interface GeographicRestriction {
  /** Excluded countries/regions (ISO codes or names) */
  excludedRegions?: string[];

  /** Include online transactions even in excluded regions */
  onlineExempt?: boolean;
}

/**
 * Conditions that must be met for a reward rule to apply
 */
export interface RewardCondition {
  /** Payment type restriction (optional) */
  paymentType?: PaymentType;

  /** Currency restriction - 'HKD' or 'foreign' or specific currencies */
  currency?: Currency | 'foreign';

  /** Excluded currencies */
  excludedCurrencies?: Currency[];

  /** Day of week restriction (optional) */
  dayOfWeek?: DayOfWeek[];

  /** Minimum transaction amount (optional) */
  minAmount?: number;

  /** Maximum transaction amount (optional) */
  maxAmount?: number;

  /** Minimum monthly spending to unlock this reward tier */
  minMonthlySpending?: number;

  /** Geographic restrictions */
  geographic?: GeographicRestriction;
}

/**
 * Priority determines which rule applies when multiple rules match
 * Higher priority = applied first
 * Rules with same priority are cumulative (rates add up)
 */
export type RulePriority = 'base' | 'bonus' | 'premium';

/**
 * A reward rule defines how rewards are calculated
 * for specific merchant types and conditions
 */
export interface RewardRule {
  /** Unique ID for this rule (for debugging/tracking) */
  id: string;

  /** Merchant types this rule applies to ('all' for universal rules) */
  merchantTypes: string[] | ['all'];

  /** Reward rate as percentage per dollar spent (e.g., 0.02 = 2%) */
  rewardRate: number;

  /** Unit of rewards earned */
  rewardUnit: RewardUnit;

  /** Rule priority for conflict resolution */
  priority: RulePriority;

  /** Whether this rule is cumulative with base rate */
  isCumulative: boolean;

  /** Optional conditions that must be met */
  conditions?: RewardCondition;

  /** Description of this reward rule (for display) */
  description: string;

  /** Excluded merchant categories (MCCs or types) */
  excludedMerchants?: string[];

  /** Maximum spending amount eligible for this rate per month (e.g., first $10,000) */
  monthlySpendingCap?: number;

  /** Fallback rate after monthly cap is reached */
  fallbackRate?: number;
}

/**
 * Fee structure for a credit card
 */
export interface FeeStructure {
  /** Annual fee in HKD */
  annualFee: number;

  /** Transaction fee percentage (e.g., 0.015 = 1.5%) */
  foreignTransactionFeeRate?: number;

  /** Cash advance fee */
  cashAdvanceFee?: number;

  /** Late payment fee */
  latePaymentFee?: number;
}

/**
 * Reward cap limits
 */
export interface RewardCap {
  /** Maximum reward amount per month */
  monthlyLimit?: number;

  /** Maximum reward amount per year */
  yearlyLimit?: number;

  /** Unit of the cap limit */
  unit: RewardUnit;

  /** Minimum amount to trigger redemption */
  redemptionThreshold?: number;

  /** Current accumulated rewards (for tracking, optional) */
  currentAccumulated?: number;
}

/**
 * Credit Card entity
 */
export interface CreditCard {
  /** Unique identifier */
  id: string;

  /** Card name */
  name: string;

  /** Issuing bank */
  issuer: string;

  /** Image URL for card visual */
  imageUrl?: string;

  /** Application URL */
  applyUrl: string;

  /** Reward rules for this card (ordered by priority) */
  rewards: RewardRule[];

  /** Fee structure */
  fees: FeeStructure;

  /** Reward caps (optional) */
  rewardCap?: RewardCap;

  /** Card network (Visa, Mastercard, etc.) */
  network?: string;

  /** Tags for filtering/categorization */
  tags?: string[];

  /** Is this card currently active/available */
  isActive: boolean;

  /** Last updated timestamp */
  lastUpdated: string;

  /** Terms and conditions URL */
  termsUrl?: string;
}
