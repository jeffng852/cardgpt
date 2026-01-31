/**
 * Core Reward Calculation Engine
 *
 * Implements the priority + cumulative reward calculation algorithm
 * as defined in SCHEMA_DESIGN.md
 */

import type { CreditCard, RewardRule } from '@/types/card';
import type { Transaction } from '@/types/transaction';
import type { RewardCalculation, RuleContribution, ContributionType } from '@/types/recommendation';

/**
 * Check if a reward rule is currently valid based on temporal fields
 * Returns false if the rule has expired or hasn't started yet
 */
function isRuleTemporallyValid(rule: RewardRule, transactionDate?: Date): boolean {
  const checkDate = transactionDate || new Date();
  const today = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Check if rule has started
  if (rule.validFrom && rule.validFrom > today) {
    return false; // Rule hasn't started yet
  }

  // Check if rule has expired
  if (rule.validUntil && rule.validUntil < today) {
    return false; // Rule has expired
  }

  return true;
}

/**
 * Check if a reward rule matches a transaction
 */
function matchesRule(rule: RewardRule, transaction: Transaction): boolean {
  // Phase 1: Check temporal validity first (most efficient filter)
  if (!isRuleTemporallyValid(rule, transaction.date)) {
    return false;
  }

  // NEW SCHEMA: Check categories and specific merchants
  if (rule.categories || rule.specificMerchants) {
    let matched = false;

    // Check if rule applies to all merchants
    if (rule.categories && rule.categories.includes('all' as any)) {
      matched = true;
    }
    // Check specific merchant ID match (highest priority)
    else if (rule.specificMerchants && transaction.merchantId) {
      if (rule.specificMerchants.includes(transaction.merchantId)) {
        matched = true;
      }
    }
    // Check category match
    else if (rule.categories && transaction.category) {
      if (rule.categories.some(cat => cat === transaction.category)) {
        matched = true;
      }
    }

    // If new schema is used but no match, return false
    if (!matched) return false;

    // Check excluded categories
    if (rule.excludedCategories && transaction.category) {
      if (rule.excludedCategories.includes(transaction.category)) {
        return false;
      }
    }

    // Check excluded specific merchants
    if (rule.excludedMerchants && transaction.merchantId) {
      if (rule.excludedMerchants.includes(transaction.merchantId)) {
        return false;
      }
    }
  }
  // OLD SCHEMA (backward compatibility): Check merchantTypes
  else if (rule.merchantTypes) {
    const merchantTypes = rule.merchantTypes as string[];
    const merchantMatch =
      merchantTypes.includes('all') ||
      (transaction.merchantType && merchantTypes.includes(transaction.merchantType)) ||
      (transaction.category && merchantTypes.includes(transaction.category)) ||
      (transaction.merchantId && merchantTypes.includes(transaction.merchantId));

    if (!merchantMatch) return false;

    // Check excluded merchants (old schema)
    if (rule.excludedMerchants && transaction.merchantType) {
      if (rule.excludedMerchants.includes(transaction.merchantType)) {
        return false;
      }
    }
  } else {
    // No merchant matching criteria specified
    return false;
  }

  // Check conditions if present
  if (!rule.conditions) return true;

  const { conditions } = rule;

  // Check payment type
  if (conditions.paymentType && conditions.paymentType !== transaction.paymentType) {
    return false;
  }

  // Check currency condition
  if (conditions.currency) {
    if (conditions.currency === 'foreign') {
      // Any non-HKD currency
      if (transaction.currency === 'HKD') return false;
    } else if (conditions.currency !== transaction.currency) {
      // Specific currency match
      return false;
    }
  }

  // Check excluded currencies
  if (conditions.excludedCurrencies) {
    if (conditions.excludedCurrencies.includes(transaction.currency)) {
      return false;
    }
  }

  // Check day of week
  if (conditions.dayOfWeek && transaction.date) {
    const dayNames: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> =
      ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const transactionDay = dayNames[transaction.date.getDay()];
    if (!conditions.dayOfWeek.includes(transactionDay)) {
      return false;
    }
  }

  // Check minimum amount
  if (conditions.minAmount && transaction.amount < conditions.minAmount) {
    return false;
  }

  // Check maximum amount
  if (conditions.maxAmount && transaction.amount > conditions.maxAmount) {
    return false;
  }

  // Check geographic restrictions
  if (conditions.geographic && transaction.location) {
    const { excludedRegions, onlineExempt } = conditions.geographic;

    if (excludedRegions && excludedRegions.includes(transaction.location)) {
      // If region is excluded, check if online transactions are exempt
      if (!(onlineExempt && transaction.paymentType === 'online')) {
        return false;
      }
    }
  }

  // Note: minMonthlySpending requires tracking user's monthly spending
  // This would be handled at a higher level with spending history
  // For now, we assume the condition is met if present

  return true;
}

/**
 * Calculate reward for a single card and transaction
 *
 * Algorithm:
 * 1. Find all matching rules
 * 2. Group by priority (base, bonus, specific)
 * 3. Check for specific rules first - if any match, they replace base entirely
 * 4. If no specific rules, apply base rate + stack all bonus rules
 * 5. Handle monthly spending caps with fallback rates
 */
export function calculateReward(
  card: CreditCard,
  transaction: Transaction,
  options?: {
    monthlySpending?: number; // User's current monthly spending for cap tracking
  }
): RewardCalculation {
  const matchingRules = card.rewards.filter(rule =>
    matchesRule(rule, transaction)
  );

  if (matchingRules.length === 0) {
    return {
      cardId: card.id,
      rewardAmount: 0,
      rewardUnit: 'cash',
      effectiveRate: 0,
      appliedRules: [],
      ruleBreakdown: [],
      fees: calculateFees(card, transaction),
      cappedOut: false
    };
  }

  // Group rules by priority
  const baseRules = matchingRules.filter(r => r.priority === 'base');
  const bonusRules = matchingRules.filter(r => r.priority === 'bonus');
  const specificRules = matchingRules.filter(r => r.priority === 'specific');

  let totalRate = 0;
  const appliedRules: string[] = [];
  const ruleBreakdown: RuleContribution[] = [];

  // Helper to create a RuleContribution with reward cap logic
  const createContribution = (
    rule: RewardRule,
    contributionType: ContributionType
  ): RuleContribution => {
    const calculatedAmount = transaction.amount * rule.rewardRate;
    const wasCapped = rule.maxRewardCap !== undefined && calculatedAmount > rule.maxRewardCap;
    const cappedAmount = wasCapped ? rule.maxRewardCap! : calculatedAmount;

    return {
      ruleId: rule.id,
      rate: rule.rewardRate,
      amount: cappedAmount,
      description: rule.description,
      description_zh: rule.description_zh,
      priority: rule.priority,
      isPromotional: rule.isPromotional,
      validUntil: rule.validUntil,
      maxRewardCap: rule.maxRewardCap,
      wasCapped,
      originalAmount: wasCapped ? calculatedAmount : undefined,
      actionRequired: rule.actionRequired,
      actionRequired_zh: rule.actionRequired_zh,
      contributionType,
    };
  };

  // Check if any specific rules match - they replace base entirely
  if (specificRules.length > 0) {
    // Use the highest specific rate (mutually exclusive with base)
    const highestSpecific = specificRules.reduce((max, r) =>
      r.rewardRate > max.rewardRate ? r : max
    );
    totalRate = highestSpecific.rewardRate;
    appliedRules.push(highestSpecific.id);
    ruleBreakdown.push(createContribution(highestSpecific, 'replaced'));
  } else {
    // No specific rules - apply base rate
    const baseRule = baseRules[0];
    if (baseRule) {
      totalRate = baseRule.rewardRate;
      appliedRules.push(baseRule.id);
      ruleBreakdown.push(createContribution(baseRule, 'base'));
    }
  }

  // Stack all bonus rules on top (regardless of whether base or specific was used)
  for (const bonus of bonusRules) {
    totalRate += bonus.rewardRate;
    appliedRules.push(bonus.id);
    ruleBreakdown.push(createContribution(bonus, 'stacked'));
  }

  // 4. Calculate final reward amount from capped rule contributions
  const rewardAmount = ruleBreakdown.reduce((sum, contrib) => sum + contrib.amount, 0);
  const cappedOut = ruleBreakdown.some(contrib => contrib.wasCapped);
  const effectiveRate = totalRate; // Keep for reference
  const rewardUnit = matchingRules[0].rewardUnit; // All matching rules should have same unit

  // 6. Calculate fees
  const fees = calculateFees(card, transaction);

  return {
    cardId: card.id,
    rewardAmount,
    rewardUnit,
    effectiveRate,
    appliedRules,
    ruleBreakdown,
    fees,
    cappedOut
  };
}

/**
 * Calculate applicable fees for a transaction
 */
function calculateFees(card: CreditCard, transaction: Transaction): number {
  let totalFees = 0;

  // Foreign transaction fee
  if (transaction.currency !== 'HKD' && card.fees.foreignTransactionFeeRate) {
    totalFees += transaction.amount * card.fees.foreignTransactionFeeRate;
  }

  // Note: Annual fees, cash advance fees, etc. are not transaction-specific
  // They would be displayed separately in the card details

  return totalFees;
}

/**
 * Calculate net value (reward - fees) for comparison
 */
export function calculateNetValue(calculation: RewardCalculation): number {
  return calculation.rewardAmount - calculation.fees;
}

/**
 * Get the display name for a reward unit, using program name if available
 * @param rewardUnit - The reward unit type (cash, miles, points)
 * @param card - Optional card to get program-specific name
 * @param useShortName - If true, use shortName when available (for compact UI)
 */
export function getRewardUnitName(
  rewardUnit: string,
  card?: CreditCard,
  useShortName: boolean = false
): string {
  if (rewardUnit === 'cash') {
    return ''; // Cash uses $ prefix, no suffix needed
  }

  // Check if card has a specific program name for this unit
  if (card?.rewardPrograms) {
    const program = card.rewardPrograms[rewardUnit as 'miles' | 'points'];
    if (program) {
      return useShortName && program.shortName ? program.shortName : program.name;
    }
  }

  // Fallback to generic names
  return rewardUnit;
}

/**
 * Format reward amount for display
 * @param calculation - The reward calculation
 * @param card - Optional card to get program-specific names
 */
export function formatReward(calculation: RewardCalculation, card?: CreditCard): string {
  const { rewardAmount, rewardUnit } = calculation;

  switch (rewardUnit) {
    case 'cash':
      return `$${rewardAmount.toFixed(2)}`;
    case 'miles':
    case 'points': {
      const programName = getRewardUnitName(rewardUnit, card);
      return `${Math.round(rewardAmount)} ${programName}`;
    }
    default:
      return `${rewardAmount.toFixed(2)} ${rewardUnit}`;
  }
}

/**
 * Calculate effective reward percentage for display
 */
export function formatEffectiveRate(calculation: RewardCalculation): string {
  return `${(calculation.effectiveRate * 100).toFixed(2)}%`;
}
