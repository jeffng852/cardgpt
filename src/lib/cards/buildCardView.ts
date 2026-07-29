/**
 * buildCardView — pure, render-free view-builder for the shared brutalist card
 * (contract .planning/design/ui-contract-v2.md §5).
 *
 * Maps a CreditCard (+ optional ranked-mode calculation) to a typed CardView that
 * CreditCardCard renders. Extracted as a pure helper — mirroring applyCtaProps —
 * so the derived fields (type badge, data grid, best-for, CTA state, 2-line
 * reserve) are unit-testable in node-env vitest with no component-render
 * devDependency (single-artifact simplicity). Reused by the Phase 9 directory in
 * browse mode (D-05), so the shape is locked here to avoid downstream rework.
 *
 * The affiliate anchor decision is delegated to applyCtaProps — the D-05 rel
 * triplet (`sponsored nofollow noopener`) is NOT re-implemented here.
 */

import type { CreditCard, CardType, RewardUnit } from '@/types/card';
import type { RewardCalculation } from '@/types/recommendation';
import { formatReward, getRewardUnitName } from '@/lib/engine/calculateReward';
import { applyCtaProps, type ApplyCtaProps } from '@/lib/affiliate/applyCtaProps';

/** Uppercase card-type badge label (contract §1 badge colors keyed off this). */
export type CardTypeBadge = 'CREDIT' | 'CRYPTO' | 'PREPAID';

/** A single hairline label/value row in the card's data grid. */
export interface CardViewRow {
  /** Stable row identity — the component maps this to an i18n label + styling. */
  id: 'reward' | 'topReward' | 'rewardType' | 'annualFee' | 'fxFee';
  /** Pre-formatted display value (Geist Mono, tabular). '' when `free`. */
  value: string;
  /** Reward unit for the rewardType row, so the component can translate a fallback. */
  unit?: RewardUnit;
  /** True when the value is "Free" (annual/fx fee of 0/undefined) — component renders t('free'). */
  free?: boolean;
  /** Positive reward → mint-dark accent (contract §5). */
  accent?: boolean;
  /** HK$ spend the reward was computed on, for the "Reward on HK$X" label. */
  amount?: number;
}

/** Footer CTA state. */
export interface CardViewCta {
  /** Anchor props from applyCtaProps (rel triplet + target), or null when no link. */
  props: ApplyCtaProps | null;
  /** Uppercase CTA label. */
  label: 'APPLY' | 'VIEW CARD';
  /** True when the card has no applyUrl — component shows "No apply link · still ranked". */
  noApplyLink: boolean;
}

/** The plain view object consumed by CreditCardCard. */
export interface CardView {
  cardId: string;
  issuer: string;
  name: string;
  typeBadge: CardTypeBadge;
  isTopPick: boolean;
  dataGrid: CardViewRow[];
  /** Bounded list of raw category / unit labels for the "best for" chips. */
  bestFor: string[];
  cta: CardViewCta;
  /** Alignment rule (D-06) — always 2. */
  reserveNameLines: 2;
}

export interface BuildCardViewOptions {
  /** 'ranked' shows the contextual reward rows; 'browse' omits them (Phase 9). */
  mode: 'ranked' | 'browse';
  /** The reward calculation for this card in ranked mode. */
  calculation?: RewardCalculation;
  /** Marks the top-ranked pick (RECOMMENDED tag + mint footer). */
  isTopPick?: boolean;
}

const TYPE_BADGE: Record<CardType, CardTypeBadge> = {
  credit: 'CREDIT',
  crypto: 'CRYPTO',
  prepaid: 'PREPAID',
};

const MAX_BEST_FOR = 3;

/** Format a decimal rate as a 1dp percent, e.g. 0.05 -> "5.0%". */
function formatRatePct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Derive the bounded "best for" chip labels from existing card data only. */
function deriveBestFor(card: CreditCard): string[] {
  const seen = new Set<string>();
  for (const rule of card.rewards) {
    for (const cat of rule.categories ?? []) {
      if (cat && cat !== 'all') seen.add(cat);
    }
    if (seen.size >= MAX_BEST_FOR) break;
  }
  const chips = Array.from(seen).slice(0, MAX_BEST_FOR);
  // Never fabricate: if a card has only universal rules, fall back to its reward unit.
  if (chips.length === 0 && card.rewards[0]) {
    chips.push(card.rewards[0].rewardUnit);
  }
  return chips;
}

/** Build the ranked reward rows (reward + top reward) from the calculation. */
function buildRewardRows(card: CreditCard, calculation: RewardCalculation): CardViewRow[] {
  const rows: CardViewRow[] = [];

  // Spend the reward was computed on (amount = spend * rate) — for the row label.
  const spend =
    calculation.effectiveRate > 0
      ? Math.round(calculation.rewardAmount / calculation.effectiveRate)
      : undefined;

  rows.push({
    id: 'reward',
    value: formatReward(calculation, card),
    accent: calculation.rewardAmount > 0,
    amount: spend,
  });

  const rates = (calculation.ruleBreakdown ?? []).map((c) => c.rate);
  const topRate = rates.length > 0 ? Math.max(...rates) : calculation.effectiveRate;
  rows.push({ id: 'topReward', value: formatRatePct(topRate) });

  return rows;
}

/**
 * Map a card (+ optional ranked calculation) to its render-ready CardView.
 */
export function buildCardView(card: CreditCard, opts: BuildCardViewOptions): CardView {
  const { mode, calculation, isTopPick = false } = opts;

  const dataGrid: CardViewRow[] = [];

  // Contextual reward rows: ranked mode only (browse omits them, not zeroed).
  if (mode === 'ranked' && calculation) {
    dataGrid.push(...buildRewardRows(card, calculation));
  }

  // Reward type — program name when available, else the raw unit for the component
  // to translate (getRewardUnitName returns '' for cash / generic label otherwise).
  const rewardUnit: RewardUnit =
    calculation?.rewardUnit ?? card.rewards[0]?.rewardUnit ?? 'cash';
  dataGrid.push({
    id: 'rewardType',
    value: getRewardUnitName(rewardUnit, card),
    unit: rewardUnit,
  });

  // Annual fee (Free when 0).
  const annualFee = card.fees.annualFee;
  dataGrid.push({
    id: 'annualFee',
    value: annualFee > 0 ? `$${annualFee.toLocaleString('en-US')}` : '',
    free: annualFee <= 0,
  });

  // FX fee (Free when 0/undefined).
  const fxRate = card.fees.foreignTransactionFeeRate;
  const fxFree = fxRate === undefined || fxRate <= 0;
  dataGrid.push({
    id: 'fxFee',
    value: fxFree ? '' : formatRatePct(fxRate!),
    free: fxFree,
  });

  const hasLink = Boolean(card.applyUrl);
  const cta: CardViewCta = {
    props: applyCtaProps(card.applyUrl),
    label: mode === 'browse' ? 'VIEW CARD' : 'APPLY',
    noApplyLink: !hasLink,
  };

  return {
    cardId: card.id,
    issuer: card.issuer,
    name: card.name,
    typeBadge: TYPE_BADGE[card.cardType],
    isTopPick,
    dataGrid,
    bestFor: deriveBestFor(card),
    cta,
    reserveNameLines: 2,
  };
}
