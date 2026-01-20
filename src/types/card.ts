/**
 * Credit Card domain types
 * Based on CardGPT PRD requirements
 */

/** Supported reward units */
export type RewardUnit = 'cash' | 'miles' | 'points';

/** Payment types */
export type PaymentType = 'online' | 'offline';

/** Currency codes */
export type Currency = 'HKD' | 'USD' | 'CNY' | 'JPY' | 'EUR' | 'GBP';

/** Day of week for special promotions */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Conditions that must be met for a reward rule to apply
 */
export interface RewardCondition {
  /** Payment type restriction (optional) */
  paymentType?: PaymentType;

  /** Currency restriction (optional) */
  currency?: Currency;

  /** Day of week restriction (optional) */
  dayOfWeek?: DayOfWeek[];

  /** Minimum transaction amount (optional) */
  minAmount?: number;

  /** Maximum transaction amount (optional) */
  maxAmount?: number;
}

/**
 * A reward rule defines how rewards are calculated
 * for specific merchant types and conditions
 */
export interface RewardRule {
  /** Merchant types this rule applies to */
  merchantTypes: string[];

  /** Reward rate as percentage per dollar spent (e.g., 0.02 = 2%) */
  rewardRate: number;

  /** Unit of rewards earned */
  rewardUnit: RewardUnit;

  /** Optional conditions that must be met */
  conditions?: RewardCondition[];

  /** Description of this reward rule (for display) */
  description?: string;
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

  /** Reward rules for this card */
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
}
