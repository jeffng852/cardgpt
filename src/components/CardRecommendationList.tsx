'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CardRecommendation } from '@/types/recommendation';
import { formatReward, formatEffectiveRate } from '@/lib/engine/calculateReward';
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
              💵 {t('cashBack')} ({recommendations.filter(r => r.calculation.rewardUnit === 'cash').length})
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
              ✈️ {tRewardTypes('miles')} ({recommendations.filter(r => r.calculation.rewardUnit === 'miles').length})
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
              ⭐ {tRewardTypes('points')} ({recommendations.filter(r => r.calculation.rewardUnit === 'points').length})
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

          return (
            <div
              key={recommendation.card.id}
              className={`bg-surface border-2 rounded-2xl p-6 transition-all ${
                isTopRecommended
                  ? 'border-primary shadow-md'
                  : 'border-border hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-4">
                {/* Card Image */}
                {hasCardImage(recommendation.card.id) ? (
                  <div className="flex-shrink-0 w-24 h-16 relative rounded-lg overflow-hidden border border-border">
                    <Image
                      src={getCardImageUrl(recommendation.card.id)}
                      alt={recommendation.card.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-24 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                )}

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-lg font-semibold text-left text-text-primary">
                      {recommendation.card.name}
                    </h4>
                    {isTopRecommended && (
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full whitespace-nowrap">
                        ⭐ {t('recommended')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-left text-text-secondary">
                    {recommendation.card.issuer}
                  </p>
                </div>

                {/* Reward Amount */}
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">
                    {formatReward(recommendation.calculation)}
                  </div>
                  <div className="text-xs text-text-secondary whitespace-nowrap">
                    {formatEffectiveRate(recommendation.calculation)} back
                  </div>
                </div>
              </div>

              {/* Reward Breakdown */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-input-bg rounded-xl">
                <div>
                  <div className="text-xs text-text-tertiary mb-1">{t('estimatedReward')}</div>
                  <div className="text-sm font-medium text-text-primary">
                    {formatReward(recommendation.calculation)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-tertiary mb-1">{t('transactionFee')}</div>
                  <div className="text-sm font-medium text-text-primary">
                    {recommendation.calculation.fees > 0
                      ? `HKD $${recommendation.calculation.fees.toFixed(2)}`
                      : t('none')}
                  </div>
                </div>
              </div>

              {/* Expand/Collapse Button */}
              <button
                onClick={() => toggleExpand(recommendation.card.id)}
                className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
              >
                {isExpanded ? t('hideDetails') : t('showDetails')}
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div>
                    <div className="text-xs text-text-tertiary mb-1">{t('annualFee')}</div>
                    <div className="text-sm text-text-primary">
                      {recommendation.card.fees.annualFee > 0
                        ? `HKD $${recommendation.card.fees.annualFee.toFixed(2)}`
                        : t('free')}
                    </div>
                  </div>

                  {recommendation.calculation.appliedRules.length > 0 && (
                    <div>
                      <div className="text-xs text-text-tertiary mb-2">{t('appliedRewards')}</div>
                      <div className="space-y-2">
                        {recommendation.calculation.appliedRules.map((ruleId, idx) => {
                          // Find the rule details from the card's rewards
                          const rule = recommendation.card.rewards.find(r => r.id === ruleId);
                          if (!rule) return null;

                          return (
                            <div key={idx} className="text-xs bg-surface p-2 rounded-lg">
                              <div className="font-medium text-text-primary mb-1">
                                {rule.description || `Rule: ${ruleId}`}
                              </div>
                              <div className="text-text-secondary">
                                Rate: {(rule.rewardRate * 100).toFixed(2)}% | Priority: {rule.priority}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {recommendation.card.applyUrl && (
                    <div className="pt-3">
                      <a
                        href={recommendation.card.applyUrl}
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
