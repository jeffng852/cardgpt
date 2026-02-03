/**
 * Credit Card domain types
 * Based on CardGPT PRD requirements
 * Enhanced to support complex reward structures like Citi Cash Back Card
 */

/** Supported reward units */
export type RewardUnit = 'cash' | 'miles' | 'points';

/** Payment types */
export type PaymentType = 'online' | 'offline' | 'contactless' | 'recurring';

/** Currency codes */
export type Currency = 'HKD' | 'USD' | 'CNY' | 'JPY' | 'EUR' | 'GBP' | 'SGD' | 'AUD' | 'CAD' | 'TWD';

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
 * Priority determines how a rule contributes to the total reward
 * - base: Foundation rate, applied first
 * - bonus: Stacks on top of base rate (cumulative)
 * - specific: Replaces base rate entirely (mutually exclusive, e.g., specific merchant rates)
 */
export type RulePriority = 'base' | 'bonus' | 'specific';

/**
 * A reward rule defines how rewards are calculated
 * for specific merchant types and conditions
 */
export interface RewardRule {
  /** Unique ID for this rule (for debugging/tracking) */
  id: string;

  /**
   * Broad merchant categories this rule applies to
   * Examples: 'dining', 'travel', 'retail', 'online-shopping'
   * Use ['all'] for universal rules that apply to all merchants
   */
  categories?: string[] | ['all'];

  /**
   * Specific merchant identifiers this rule applies to
   * Examples: 'mcdonalds', 'sushiro', '759-store', 'netflix'
   * These are exact merchant names, not categories
   */
  specificMerchants?: string[];

  /**
   * @deprecated Use categories and/or specificMerchants instead
   * Kept for backward compatibility during migration
   */
  merchantTypes?: string[] | ['all'];

  /** Reward rate as percentage per dollar spent (e.g., 0.02 = 2%) */
  rewardRate: number;

  /** Unit of rewards earned */
  rewardUnit: RewardUnit;

  /** Rule priority - determines how this rule contributes to total reward */
  priority: RulePriority;

  /**
   * @deprecated Use priority instead: 'bonus' = cumulative, 'specific' = not cumulative
   * Kept for backward compatibility during migration
   */
  isCumulative?: boolean;

  /** Optional conditions that must be met */
  conditions?: RewardCondition;

  /** Description of this reward rule (for display) */
  description: string;

  /** Chinese (Traditional) translation of description */
  description_zh?: string;

  /** Excluded merchant categories */
  excludedCategories?: string[];

  /** Excluded specific merchants */
  excludedMerchants?: string[];

  /** Maximum reward amount that can be earned from this rule per month */
  maxRewardCap?: number;

  // ===== Phase 1: Temporal Validity Fields =====

  /**
   * Start date when this rule becomes active (ISO date string: YYYY-MM-DD)
   * If omitted, rule is active from the beginning of time
   */
  validFrom?: string;

  /**
   * End date when this rule expires (ISO date string: YYYY-MM-DD)
   * If omitted, rule has no expiration (ongoing)
   */
  validUntil?: string;

  /**
   * Whether this is a time-limited promotional offer
   * true = promotional (may expire, show warning to users)
   * false = base/permanent reward structure
   */
  isPromotional: boolean;

  // ===== Phase 1: Source Tracking Fields =====

  /**
   * URL where this reward information was sourced from
   * For traceability and verification
   */
  sourceUrl?: string;

  /**
   * ISO date when the source was last verified (YYYY-MM-DD)
   * Helps identify potentially stale data
   */
  sourceLastVerified?: string;

  /**
   * Free-text notes for edge cases, special conditions, or caveats
   * that don't fit into structured fields
   */
  notes?: string;

  /** Chinese (Traditional) translation of notes */
  notes_zh?: string;

  /**
   * Action required to activate this reward (e.g., "Register online", "Activate in app")
   * Used for promotional offers that require user action
   */
  actionRequired?: string;

  /** Chinese (Traditional) translation of actionRequired */
  actionRequired_zh?: string;
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

  /** Fee for redeeming rewards (e.g., converting points to cash) in HKD */
  redemptionFee?: number;
}

/**
 * Reward program information
 * Used to display specific loyalty program names instead of generic "miles" or "points"
 */
export interface RewardProgramInfo {
  /** Full program name (e.g., "Asia Miles", "Yuu Points") */
  name: string;

  /** Short name for compact UI (e.g., "AM", "Yuu") */
  shortName?: string;

  /** Program operator (e.g., "Cathay Pacific", "Dairy Farm") */
  operator?: string;
}

/**
 * Reward programs mapping for a card
 * Maps reward unit types to their specific program details
 */
export interface RewardPrograms {
  /** Miles program details (e.g., Asia Miles, KrisFlyer) */
  miles?: RewardProgramInfo;

  /** Points program details (e.g., Yuu, MoneyBack) */
  points?: RewardProgramInfo;
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

  /** Application URL (optional - only shown when referral link available) */
  applyUrl?: string;

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

  /**
   * Raw T&C content extracted from source document
   * Stored for reference and potential user display
   */
  termsContent?: string;

  /**
   * Date when T&C content was extracted (ISO date string)
   */
  termsExtractedAt?: string;

  /**
   * Minimum annual income required for card application (in HKD)
   */
  minIncomeRequirement?: number;

  /**
   * Reward program details for miles/points programs
   * Used to display specific program names (e.g., "Asia Miles" instead of "miles")
   */
  rewardPrograms?: RewardPrograms;
}
