'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { CardRecommendation, RuleContribution } from '@/types/recommendation';
import { getRewardUnitName } from '@/lib/engine/calculateReward';
import type { CreditCard, RewardUnit } from '@/types/card';
import { buildCardView } from '@/lib/cards/buildCardView';
import CreditCardCard from '@/components/CreditCardCard';

interface CardRecommendationListProps {
  recommendations: CardRecommendation[];
  isLoading?: boolean;
}

export default function CardRecommendationList({
  recommendations,
  isLoading = false
}: CardRecommendationListProps) {
  const t = useTranslations('results');
  const tRewardTypes = useTranslations('rewardTypes');
  const locale = useLocale();
  const isZh = locale === 'zh-HK';
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterRewardType, setFilterRewardType] = useState<'all' | RewardUnit>('all');

  // Locale-aware text helpers - use Chinese if available, fallback to English
  const getDescription = (contribution: RuleContribution) =>
    isZh && contribution.description_zh ? contribution.description_zh : contribution.description;

  const getActionRequired = (contribution: RuleContribution) =>
    isZh && contribution.actionRequired_zh ? contribution.actionRequired_zh : contribution.actionRequired;

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 p-8 bg-surface border border-border">
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-fg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-muted-fg">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 p-8 bg-surface border border-border text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 border border-border mb-4">
          <svg className="w-8 h-8 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase text-fg mb-2">
          {t('noResults')}
        </h3>
        <p className="text-sm text-muted-fg">
          {t('noResultsHint')}
        </p>
      </div>
    );
  }

  // Filter recommendations by reward type
  const filteredRecommendations = filterRewardType === 'all'
    ? recommendations
    : recommendations.filter(rec => rec.calculation.rewardUnit === filterRewardType);

  // Get unique reward types from recommendations
  const availableRewardTypes = new Set(recommendations.map(rec => rec.calculation.rewardUnit));

  const toggleExpand = (cardId: string) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  // Format rate as percentage
  const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  // Format amount based on reward unit, using program name when available
  const formatAmount = (amount: number, unit: string, card?: CreditCard) => {
    if (unit === 'cash') {
      return `$${amount.toFixed(2)}`;
    }
    const unitName = getRewardUnitName(unit, card);
    return `${Math.round(amount)} ${unitName}`;
  };

  // Rule-tag label (base / limited offer / merchant bonus) — behavior preserved
  const getTagLabel = (contribution: RuleContribution) => {
    if (contribution.priority === 'base') return t('tags.base');
    if (contribution.isPromotional) return t('tags.limitedOffer');
    return t('tags.merchantOffer');
  };

  // v2 hairline tag styling (replaces the old slate/emerald/amber gradient tags)
  const getTagStyle = (contribution: RuleContribution) => {
    if (contribution.priority === 'base') return 'bg-muted text-muted-fg';
    if (contribution.isPromotional) return 'bg-neon-yellow text-[#121212]';
    return 'bg-primary text-primary-fg';
  };

  // Tab button styling (v2 underline tabs)
  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active ? 'border-border-strong text-fg' : 'border-transparent text-muted-fg hover:text-fg'
    }`;

  const tabs: Array<{ unit: RewardUnit; label: string }> = [
    { unit: 'cash', label: t('cashBack') },
    { unit: 'miles', label: tRewardTypes('miles') },
    { unit: 'points', label: tRewardTypes('points') },
    { unit: 'crypto', label: tRewardTypes('crypto') },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Filter Tabs (behavior preserved: all + per-unit with counts) */}
      {availableRewardTypes.size > 1 && (
        <div className="mb-6 flex gap-2 border-b border-border">
          <button onClick={() => setFilterRewardType('all')} className={tabClass(filterRewardType === 'all')}>
            {t('allCards')} ({recommendations.length})
          </button>
          {tabs
            .filter(({ unit }) => availableRewardTypes.has(unit))
            .map(({ unit, label }) => (
              <button
                key={unit}
                onClick={() => setFilterRewardType(unit)}
                className={tabClass(filterRewardType === unit)}
              >
                {label} ({recommendations.filter(r => r.calculation.rewardUnit === unit).length})
              </button>
            ))}
        </div>
      )}

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase text-fg">
          {t('found')} {filteredRecommendations.length} {filteredRecommendations.length === 1 ? t('card') : t('cards')}
        </h3>
      </div>

      {/* Card List — ranked CreditCardCard (D-05); index 0 is the top pick */}
      <div className="space-y-4">
        {filteredRecommendations.map((recommendation, index) => {
          const { calculation, card } = recommendation;
          const isExpanded = expandedCardId === card.id;
          const view = buildCardView(card, {
            mode: 'ranked',
            calculation,
            isTopPick: index === 0,
          });
          const ruleBreakdown = calculation.ruleBreakdown || [];

          return (
            <CreditCardCard
              key={card.id}
              view={view}
              mode="ranked"
              isExpanded={isExpanded}
              onToggle={() => toggleExpand(card.id)}
            >
              {/* Expandable detail — rule breakdown, alerts, fees, min-income (restyled to hairlines) */}
              <div className="border-t border-border pt-3 pb-2">
                {ruleBreakdown.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wide text-muted-fg mb-2">
                      {t('breakdown.title')}
                    </h5>
                    <div className="divide-y divide-border border-y border-border">
                      {ruleBreakdown.map((contribution, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase ${getTagStyle(contribution)}`}>
                                {getTagLabel(contribution)}
                              </span>
                              <span className="text-xs text-muted-fg line-clamp-2">
                                {getDescription(contribution)}
                              </span>
                            </div>
                            {contribution.monthlySpendingCap && (
                              <div className="mt-0.5 text-[10px] text-muted-fg">
                                {t('breakdown.cap')}: ${contribution.monthlySpendingCap.toLocaleString()}/{t('breakdown.month')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 font-[family-name:var(--font-mono)] tabular-nums">
                            <span className="text-[11px] text-muted-fg">{formatRate(contribution.rate)}</span>
                            <span className="text-xs font-bold text-fg">
                              {formatAmount(contribution.amount, calculation.rewardUnit, card)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* Total row */}
                      <div className="flex items-center justify-between gap-3 py-2">
                        <span className="text-xs font-bold uppercase text-fg">{t('breakdown.total')}</span>
                        <div className="flex items-center gap-3 font-[family-name:var(--font-mono)] tabular-nums">
                          <span className="text-[11px] text-muted-fg">{formatRate(calculation.effectiveRate)}</span>
                          <span className="text-sm font-bold text-badge-crypto">
                            {formatAmount(calculation.rewardAmount, calculation.rewardUnit, card)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expiry & action-required alerts */}
                {ruleBreakdown.some(c => c.validUntil || c.actionRequired) && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {ruleBreakdown.filter(c => c.validUntil).map((c, idx) => (
                      <span key={`expiry-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-1 border border-border text-[10px] text-fg">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('breakdown.offerExpires')}: {c.validUntil}
                      </span>
                    ))}
                    {ruleBreakdown.filter(c => c.actionRequired).map((c, idx) => (
                      <span key={`action-${idx}`} className="inline-flex items-center gap-1.5 px-2 py-1 border border-border text-[10px] text-fg">
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="line-clamp-1">{getActionRequired(c)}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Fees (redemption fee not in the header grid) + min-income */}
                <div className="text-[11px] text-muted-fg">
                  <span className="font-bold uppercase tracking-wide">{t('breakdown.fees')}:</span>{' '}
                  <span className="font-[family-name:var(--font-mono)] tabular-nums">
                    {t('annualFee')}: {card.fees.annualFee > 0 ? `$${card.fees.annualFee.toLocaleString()}` : t('free')}
                  </span>
                  {card.fees.foreignTransactionFeeRate !== undefined && (
                    <>
                      {' · '}
                      <span className="font-[family-name:var(--font-mono)] tabular-nums">
                        {t('breakdown.fxFee')}: {card.fees.foreignTransactionFeeRate > 0 ? `${(card.fees.foreignTransactionFeeRate * 100).toFixed(1)}%` : t('free')}
                      </span>
                    </>
                  )}
                  {card.fees.redemptionFee !== undefined && (
                    <>
                      {' · '}
                      <span className="font-[family-name:var(--font-mono)] tabular-nums">
                        {t('breakdown.redemptionFee')}: {card.fees.redemptionFee > 0 ? `$${card.fees.redemptionFee}` : t('free')}
                      </span>
                    </>
                  )}
                </div>
                {card.minIncomeRequirement && (
                  <div className="mt-1 text-[11px] text-muted-fg">
                    <span className="font-bold uppercase tracking-wide">{t('breakdown.minIncome')}:</span>{' '}
                    <span className="font-[family-name:var(--font-mono)] tabular-nums">
                      HKD ${card.minIncomeRequirement.toLocaleString()} {t('breakdown.perYear')}
                    </span>
                  </div>
                )}
              </div>
            </CreditCardCard>
          );
        })}
      </div>
    </div>
  );
}
