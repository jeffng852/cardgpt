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
 * 2. Group by priority (base, bonus, premium)
 * 3. Apply base rate
 * 4. Add cumulative bonuses or take max of non-cumulative
 * 5. Apply premium rate (highest wins)
 * 6. Handle monthly spending caps with fallback rates
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
  const premiumRules = matchingRules.filter(r => r.priority === 'premium');

  let totalRate = 0;
  const appliedRules: string[] = [];
  const ruleBreakdown: RuleContribution[] = [];
  let baseWasReplaced = false;

  // Helper to create a RuleContribution
  const createContribution = (
    rule: RewardRule,
    contributionType: ContributionType
  ): RuleContribution => ({
    ruleId: rule.id,
    rate: rule.rewardRate,
    amount: transaction.amount * rule.rewardRate,
    description: rule.description,
    priority: rule.priority,
    isPromotional: rule.isPromotional,
    validUntil: rule.validUntil,
    monthlySpendingCap: rule.monthlySpendingCap,
    actionRequired: rule.actionRequired,
    contributionType,
  });

  // 1. Apply base rate (only one base rule should match)
  const baseRule = baseRules[0];
  if (baseRule) {
    totalRate = baseRule.rewardRate;
    appliedRules.push(baseRule.id);
    ruleBreakdown.push(createContribution(baseRule, 'base'));
  }

  // 2. Apply bonus rules (cumulative or max)
  for (const bonus of bonusRules) {
    if (bonus.isCumulative) {
      // Stacked: adds to base rate
      totalRate += bonus.rewardRate;
      appliedRules.push(bonus.id);
      ruleBreakdown.push(createContribution(bonus, 'stacked'));
    } else {
      // Non-cumulative: replaces if higher
      if (bonus.rewardRate > totalRate) {
        totalRate = bonus.rewardRate;
        baseWasReplaced = true;
        appliedRules.push(bonus.id);
        ruleBreakdown.push(createContribution(bonus, 'replaced'));
      }
    }
  }

  // 3. Apply premium rules (highest rate wins)
  if (premiumRules.length > 0) {
    const highestPremium = Math.max(...premiumRules.map(r => r.rewardRate));
    if (highestPremium > totalRate) {
      totalRate = highestPremium;
      baseWasReplaced = true;
      const appliedPremium = premiumRules.find(r => r.rewardRate === highestPremium);
      if (appliedPremium) {
        appliedRules.push(appliedPremium.id);
        ruleBreakdown.push(createContribution(appliedPremium, 'replaced'));
      }
    }
  }

  // If base was replaced by a non-cumulative rule, mark base contribution accordingly
  if (baseWasReplaced && ruleBreakdown.length > 0 && ruleBreakdown[0].contributionType === 'base') {
    // Keep only the rules that actually contributed to the final rate
    // Filter out base rule if it was replaced
    const finalBreakdown = ruleBreakdown.filter(
      r => r.contributionType !== 'base' || !baseWasReplaced
    );
    ruleBreakdown.length = 0;
    ruleBreakdown.push(...finalBreakdown);
  }

  // 4. Handle monthly spending caps
  let cappedOut = false;
  let effectiveRate = totalRate;

  // Check if any applied rule has a monthly spending cap
  for (const ruleId of appliedRules) {
    const rule = matchingRules.find(r => r.id === ruleId);
    if (rule?.monthlySpendingCap && options?.monthlySpending !== undefined) {
      if (options.monthlySpending >= rule.monthlySpendingCap) {
        // Cap reached, use fallback rate if available
        if (rule.fallbackRate !== undefined) {
          effectiveRate = rule.fallbackRate;
          cappedOut = true;
        }
      }
    }
  }

  // 5. Calculate final reward amount
  const rewardAmount = transaction.amount * effectiveRate;
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
 * Format reward amount for display
 */
export function formatReward(calculation: RewardCalculation): string {
  const { rewardAmount, rewardUnit } = calculation;

  switch (rewardUnit) {
    case 'cash':
      return `$${rewardAmount.toFixed(2)}`;
    case 'miles':
      return `${Math.round(rewardAmount)} miles`;
    case 'points':
      return `${Math.round(rewardAmount)} points`;
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
