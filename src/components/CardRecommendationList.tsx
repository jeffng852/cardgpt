'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import type { CardRecommendation } from '@/types/recommendation';
import type { RuleContribution } from '@/types/recommendation';
import { formatReward, getRewardUnitName } from '@/lib/engine/calculateReward';
import type { CreditCard } from '@/types/card';
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
  const locale = useLocale();
  const isZh = locale === 'zh-HK';
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterRewardType, setFilterRewardType] = useState<'all' | 'cash' | 'miles' | 'points'>('all');
  const [expandedCapRuleId, setExpandedCapRuleId] = useState<string | null>(null);

  // Locale-aware text helpers - use Chinese if available, fallback to English
  const getDescription = (contribution: RuleContribution) =>
    isZh && contribution.description_zh ? contribution.description_zh : contribution.description;

  const getActionRequired = (contribution: RuleContribution) =>
    isZh && contribution.actionRequired_zh ? contribution.actionRequired_zh : contribution.actionRequired;

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
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300';
    }
    if (contribution.isPromotional) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-700/50';
    }
    // Bonus or merchant-specific offer
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700/50';
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

  // Get color for progress bar based on rule type
  const getBarColor = (contribution: RuleContribution) => {
    if (contribution.priority === 'base') {
      return 'bg-slate-400 dark:bg-slate-500';
    }
    if (contribution.isPromotional) {
      return 'bg-gradient-to-r from-amber-400 to-orange-400';
    }
    return 'bg-gradient-to-r from-emerald-400 to-teal-400';
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

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      {/* Filter Tabs */}
      {availableRewardTypes.size > 1 && (
        <div className="mb-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setFilterRewardType('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
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
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
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
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
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
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all duration-200 ${
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
          const totalAmount = ruleBreakdown.reduce((sum, c) => sum + c.amount, 0) || calculation.rewardAmount;

          return (
            <div
              key={card.id}
              className={`bg-surface rounded-2xl transition-all duration-300 ease-out overflow-hidden ${
                isTopRecommended
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
                  : 'ring-1 ring-border hover:ring-primary/40 hover:shadow-md'
              }`}
            >
              {/* Preview Layer - Clickable to expand */}
              <button
                onClick={() => toggleExpand(card.id)}
                className="w-full p-4 sm:p-5 text-left group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Card Image - Smaller on mobile */}
                  {hasCardImage(card.id) ? (
                    <div className="flex-shrink-0 w-14 h-9 sm:w-20 sm:h-14 relative rounded-lg sm:rounded-xl overflow-hidden ring-1 ring-border shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      <Image
                        src={getCardImageUrl(card.id)}
                        alt={card.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 56px, 80px"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-14 h-9 sm:w-20 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-1 ring-border flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  )}

                  {/* Card Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 mb-0.5 flex-wrap">
                      <h4 className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-2 sm:truncate">
                        {card.name}
                      </h4>
                      {isTopRecommended && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
                          {t('recommended')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary mb-2">
                      {card.issuer}
                    </p>

                    {/* Rule Tags */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {ruleBreakdown.map((contribution, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg transition-transform duration-200 hover:scale-105 ${getTagStyle(contribution)}`}
                        >
                          {getTagLabel(contribution)} {formatRate(contribution.rate)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Reward Amount */}
                  <div className="text-right flex-shrink-0 flex items-center gap-2 sm:gap-3">
                    <div className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {formatReward(calculation, card)}
                    </div>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isExpanded
                        ? 'bg-primary/10 rotate-180'
                        : 'bg-transparent group-hover:bg-primary/5'
                    }`}>
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-primary transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>

              {/* Details Layer - Expandable with animation */}
              <div className={`transition-all duration-300 ease-out overflow-hidden ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="px-4 sm:px-5 pb-5 sm:pb-6 pt-3 sm:pt-4 border-t border-border/50">

                  {/* Reward Breakdown with Checkmarks + Total */}
                  {ruleBreakdown.length > 0 && (
                    <div className="mb-4 sm:mb-5">
                      <h5 className="text-[10px] sm:text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2 sm:mb-3">
                        {t('breakdown.title')}
                      </h5>

                      <div className="space-y-2">
                        {ruleBreakdown.map((contribution, idx) => (
                          <div
                            key={idx}
                            className="flex items-start sm:items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50/50 dark:bg-slate-800/30 group/rule hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                            style={{
                              animationDelay: `${idx * 80}ms`,
                            }}
                          >
                            {/* Animated Checkmark */}
                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                              isExpanded
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 scale-100'
                                : 'bg-slate-100 dark:bg-slate-800 scale-75'
                            }`}
                            style={{ transitionDelay: `${idx * 100 + 200}ms` }}
                            >
                              <svg
                                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all duration-300 ${
                                  isExpanded
                                    ? 'text-emerald-600 dark:text-emerald-400 opacity-100'
                                    : 'text-slate-400 opacity-0'
                                }`}
                                style={{ transitionDelay: `${idx * 100 + 300}ms` }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>

                            {/* Rule Info - Stacked on mobile */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                <span className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold rounded ${getTagStyle(contribution)}`}>
                                  {getTagLabel(contribution)}
                                </span>
                                <span className="text-xs sm:text-sm text-text-secondary line-clamp-2 sm:truncate">
                                  {getDescription(contribution)}
                                </span>
                              </div>
                              {/* Capped reward explainer */}
                              {contribution.wasCapped && contribution.maxRewardCap && (
                                <div className="mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedCapRuleId(
                                        expandedCapRuleId === contribution.ruleId ? null : contribution.ruleId
                                      );
                                    }}
                                    className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5 flex-shrink-0"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    <span>{t('breakdown.rewardCapped')}</span>
                                    <svg
                                      className={`w-3 h-3 transition-transform ${expandedCapRuleId === contribution.ruleId ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  {expandedCapRuleId === contribution.ruleId && (
                                    <div className="mt-1.5 p-2 text-[10px] sm:text-xs text-text-secondary bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                      {t('breakdown.cappedExplainer', {
                                        cap: formatAmount(contribution.maxRewardCap, calculation.rewardUnit, card),
                                        original: formatAmount(contribution.originalAmount || 0, calculation.rewardUnit, card)
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Rate & Amount - Vertical on mobile */}
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-0.5 sm:gap-3 flex-shrink-0">
                              <span className="text-[10px] sm:text-xs font-medium text-text-tertiary tabular-nums">
                                {formatRate(contribution.rate)}
                              </span>
                              <span className="text-xs sm:text-sm font-bold text-primary tabular-nums">
                                {formatAmount(contribution.amount, calculation.rewardUnit, card)}
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Total Row - Integrated */}
                        <div className="flex items-center justify-between p-2.5 sm:p-3 mt-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/5 to-emerald-500/5 dark:from-primary/10 dark:to-emerald-500/10 border border-dashed border-primary/20">
                          <span className="text-xs sm:text-sm font-semibold text-text-primary">{t('breakdown.total')}</span>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm font-semibold text-text-primary tabular-nums">
                              {formatRate(calculation.effectiveRate)}
                            </span>
                            <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent tabular-nums">
                              {formatReward(calculation, card)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Alerts Section - Expiry & Action Required (Compact) */}
                  {ruleBreakdown.some(c => c.validUntil || c.actionRequired) && (
                    <div className="mb-4 sm:mb-5 flex flex-wrap gap-1.5 sm:gap-2">
                      {ruleBreakdown
                        .filter(c => c.validUntil)
                        .map((c, idx) => (
                          <div
                            key={`expiry-${idx}`}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                          >
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[10px] sm:text-xs font-medium">{t('breakdown.offerExpires')}: {c.validUntil}</span>
                          </div>
                        ))}
                      {ruleBreakdown
                        .filter(c => c.actionRequired)
                        .map((c, idx) => (
                          <div
                            key={`action-${idx}`}
                            className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300"
                          >
                            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[10px] sm:text-xs font-medium line-clamp-1">{getActionRequired(c)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Fees Section - Stacked on mobile */}
                  <div className="mb-4 sm:mb-5 text-[10px] sm:text-xs text-text-tertiary">
                    <span className="font-medium">{t('breakdown.fees')}:</span>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-wrap">
                      <span>
                        {t('annualFee')}: {' '}
                        <span className={card.fees.annualFee > 0 ? 'text-text-secondary' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                          {card.fees.annualFee > 0 ? `$${card.fees.annualFee.toLocaleString()}` : t('free')}
                        </span>
                      </span>
                      {card.fees.foreignTransactionFeeRate !== undefined && (
                        <>
                          <span className="hidden sm:inline text-border">•</span>
                          <span>
                            {t('breakdown.fxFee')}: {' '}
                            <span className={card.fees.foreignTransactionFeeRate > 0 ? 'text-text-secondary' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                              {card.fees.foreignTransactionFeeRate > 0 ? `${(card.fees.foreignTransactionFeeRate * 100).toFixed(1)}%` : t('free')}
                            </span>
                          </span>
                        </>
                      )}
                      {card.fees.redemptionFee !== undefined && (
                        <>
                          <span className="hidden sm:inline text-border">•</span>
                          <span>
                            {t('breakdown.redemptionFee')}: {' '}
                            <span className={card.fees.redemptionFee > 0 ? 'text-text-secondary' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                              {card.fees.redemptionFee > 0 ? `$${card.fees.redemptionFee}` : t('free')}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Min Income Requirement - Compact */}
                  {card.minIncomeRequirement && (
                    <div className="mb-4 sm:mb-5 text-[10px] sm:text-xs text-text-tertiary">
                      <span className="font-medium">{t('breakdown.minIncome')}:</span>{' '}
                      <span className="text-text-secondary">HKD ${card.minIncomeRequirement.toLocaleString()} {t('breakdown.perYear')}</span>
                    </div>
                  )}

                  {/* Apply Button */}
                  {card.applyUrl && (
                    <a
                      href={card.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/btn relative block w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white text-center rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {t('applyHere')}
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
