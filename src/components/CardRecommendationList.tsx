'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CardRecommendation } from '@/types/recommendation';
import type { RuleContribution } from '@/types/recommendation';
import { formatReward } from '@/lib/engine/calculateReward';
import { getCardImageUrl, hasCardImage } from '@/lib/cardImages';

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
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterRewardType, setFilterRewardType] = useState<'all' | 'cash' | 'miles' | 'points'>('all');

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 p-8 bg-surface border border-border rounded-2xl">
        <div className="flex items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-text-secondary">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8 p-8 bg-surface border border-border rounded-2xl text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-text-tertiary/10 mb-4">
          <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {t('noResults')}
        </h3>
        <p className="text-sm text-text-secondary">
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

  // Helper function to get tag style based on rule type
  const getTagStyle = (contribution: RuleContribution) => {
    if (contribution.priority === 'base') {
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
    if (contribution.isPromotional) {
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    // Bonus or merchant-specific offer
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
  };

  // Helper function to get tag label
  const getTagLabel = (contribution: RuleContribution) => {
    if (contribution.priority === 'base') {
      return t('tags.base');
    }
    if (contribution.isPromotional) {
      return t('tags.limitedOffer');
    }
    return t('tags.merchantOffer');
  };

  // Format rate as percentage
  const formatRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  // Format amount based on reward unit
  const formatAmount = (amount: number, unit: string) => {
    if (unit === 'cash') {
      return `$${amount.toFixed(2)}`;
    }
    return `${Math.round(amount)} ${unit}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Filter Tabs */}
      {availableRewardTypes.size > 1 && (
        <div className="mb-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setFilterRewardType('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filterRewardType === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t('allCards')} ({recommendations.length})
          </button>
          {availableRewardTypes.has('cash') && (
            <button
              onClick={() => setFilterRewardType('cash')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterRewardType === 'cash'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t('cashBack')} ({recommendations.filter(r => r.calculation.rewardUnit === 'cash').length})
            </button>
          )}
          {availableRewardTypes.has('miles') && (
            <button
              onClick={() => setFilterRewardType('miles')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterRewardType === 'miles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tRewardTypes('miles')} ({recommendations.filter(r => r.calculation.rewardUnit === 'miles').length})
            </button>
          )}
          {availableRewardTypes.has('points') && (
            <button
              onClick={() => setFilterRewardType('points')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filterRewardType === 'points'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tRewardTypes('points')} ({recommendations.filter(r => r.calculation.rewardUnit === 'points').length})
            </button>
          )}
        </div>
      )}

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          {t('found')} {filteredRecommendations.length} {filteredRecommendations.length === 1 ? t('card') : t('cards')}
        </h3>
      </div>

      {/* Card List */}
      <div className="space-y-4">
        {filteredRecommendations.map((recommendation, index) => {
          const isExpanded = expandedCardId === recommendation.card.id;
          const isTopRecommended = index === 0;
          const { calculation, card } = recommendation;
          const ruleBreakdown = calculation.ruleBreakdown || [];

          return (
            <div
              key={card.id}
              className={`bg-surface border-2 rounded-2xl transition-all ${
                isTopRecommended
                  ? 'border-primary shadow-md'
                  : 'border-border hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              {/* Preview Layer - Clickable to expand */}
              <button
                onClick={() => toggleExpand(card.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start gap-4">
                  {/* Card Image */}
                  {hasCardImage(card.id) ? (
                    <div className="flex-shrink-0 w-20 h-14 relative rounded-lg overflow-hidden border border-border">
                      <Image
                        src={getCardImageUrl(card.id)}
                        alt={card.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-20 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  )}

                  {/* Card Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h4 className="text-base font-semibold text-text-primary truncate">
                        {card.name}
                      </h4>
                      {isTopRecommended && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                          {t('recommended')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {card.issuer}
                    </p>

                    {/* Rule Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {ruleBreakdown.map((contribution, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getTagStyle(contribution)}`}
                        >
                          {getTagLabel(contribution)} {formatRate(contribution.rate)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reward Amount */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div className="text-xl font-bold text-primary">
                      {formatReward(calculation)}
                    </div>
                    <svg
                      className={`w-5 h-5 text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Details Layer - Expandable */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border">
                  {/* Reward Breakdown */}
                  {ruleBreakdown.length > 0 && (
                    <div className="pt-4">
                      <h5 className="text-sm font-medium text-text-primary mb-3">
                        {t('breakdown.title')}
                      </h5>
                      <div className="bg-input-bg rounded-xl p-4 space-y-2">
                        {ruleBreakdown.map((contribution, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                contribution.priority === 'base'
                                  ? 'bg-gray-400'
                                  : contribution.isPromotional
                                    ? 'bg-yellow-500'
                                    : 'bg-blue-500'
                              }`} />
                              <span className="text-text-secondary">{contribution.description}</span>
                            </div>
                            <div className="flex items-center gap-4 text-text-primary font-medium">
                              <span>{formatRate(contribution.rate)}</span>
                              <span className="text-primary">{formatAmount(contribution.amount, calculation.rewardUnit)}</span>
                            </div>
                          </div>
                        ))}

                        {/* Show cap info if any rule has it */}
                        {ruleBreakdown.some(c => c.monthlySpendingCap) && (
                          <div className="pt-2 mt-2 border-t border-border/50 text-xs text-text-tertiary">
                            {ruleBreakdown
                              .filter(c => c.monthlySpendingCap)
                              .map((c, idx) => (
                                <span key={idx}>
                                  {t('breakdown.cap')}: ${c.monthlySpendingCap?.toLocaleString()}/{t('breakdown.month')}
                                </span>
                              ))}
                          </div>
                        )}

                        {/* Total */}
                        <div className="flex items-center justify-between text-sm pt-2 mt-2 border-t border-border/50 font-medium">
                          <span className="text-text-primary">{t('breakdown.total')}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-text-primary">{formatRate(calculation.effectiveRate)}</span>
                            <span className="text-primary font-bold">{formatReward(calculation)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Offer Expiry & Action Required */}
                  {ruleBreakdown.some(c => c.validUntil || c.actionRequired) && (
                    <div className="pt-4 space-y-2">
                      {ruleBreakdown
                        .filter(c => c.validUntil)
                        .map((c, idx) => (
                          <div key={`expiry-${idx}`} className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('breakdown.offerExpires')}: {c.validUntil}</span>
                          </div>
                        ))}
                      {ruleBreakdown
                        .filter(c => c.actionRequired)
                        .map((c, idx) => (
                          <div key={`action-${idx}`} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('breakdown.actionRequired')}: {c.actionRequired}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Fees Section */}
                  <div className="pt-4">
                    <h5 className="text-sm font-medium text-text-primary mb-3">
                      {t('breakdown.fees')}
                    </h5>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-input-bg rounded-lg p-3">
                        <div className="text-xs text-text-tertiary mb-1">{t('annualFee')}</div>
                        <div className="text-sm font-medium text-text-primary">
                          {card.fees.annualFee > 0
                            ? `$${card.fees.annualFee.toLocaleString()}`
                            : t('free')}
                        </div>
                      </div>
                      <div className="bg-input-bg rounded-lg p-3">
                        <div className="text-xs text-text-tertiary mb-1">{t('breakdown.fxFee')}</div>
                        <div className="text-sm font-medium text-text-primary">
                          {card.fees.foreignTransactionFeeRate
                            ? `${(card.fees.foreignTransactionFeeRate * 100).toFixed(2)}%`
                            : '-'}
                        </div>
                      </div>
                      <div className="bg-input-bg rounded-lg p-3">
                        <div className="text-xs text-text-tertiary mb-1">{t('breakdown.redemptionFee')}</div>
                        <div className="text-sm font-medium text-text-primary">
                          {card.fees.redemptionFee
                            ? `$${card.fees.redemptionFee}`
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Min Income Requirement */}
                  {card.minIncomeRequirement && (
                    <div className="pt-4 text-sm text-text-secondary">
                      <span className="font-medium">{t('breakdown.minIncome')}:</span>{' '}
                      HKD ${card.minIncomeRequirement.toLocaleString()} {t('breakdown.perYear')}
                    </div>
                  )}

                  {/* Apply Button */}
                  {card.applyUrl && (
                    <div className="pt-4">
                      <a
                        href={card.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-6 py-3 bg-primary text-white text-center rounded-xl font-medium hover:bg-primary-hover transition-colors"
                      >
                        {t('applyHere')}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
