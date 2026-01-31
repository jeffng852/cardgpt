'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '@/types/transaction';

type RewardType = 'cash' | 'miles' | 'points';

// SVG line icons for categories (single color, matches text)
const CategoryIcon = ({ category, className = "w-4 h-4" }: { category: TransactionCategory; className?: string }) => {
  const icons: Record<TransactionCategory, React.ReactElement> = {
    groceries: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    dining: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-4.5a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    online: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
    travel: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    transport: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    overseas: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    utilities: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    financial: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    government: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
    'digital-wallet': (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    others: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  };
  return icons[category];
};

interface TransactionInputProps {
  onSubmit: (result: ParseResult, rewardType?: RewardType) => void;
}

interface AIParseState {
  isLoading: boolean;
  error?: string;
  rateLimitSeconds?: number;
  detectedCategory?: string;
  reasoning?: string;
}

export default function TransactionInput({ onSubmit }: TransactionInputProps) {
  const t = useTranslations('input');
  const tResults = useTranslations('results');
  const tMerchants = useTranslations('merchants');
  const tRewardTypes = useTranslations('rewardTypes');
  const tCategories = useTranslations('categories');
  const [input, setInput] = useState('');
  const [selectedRewardType, setSelectedRewardType] = useState<RewardType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | undefined>();
  const [selectedMerchantTag, setSelectedMerchantTag] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiState, setAIState] = useState<AIParseState>({ isLoading: false });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(true);
  const [isMerchantsExpanded, setIsMerchantsExpanded] = useState(false);
  const [showCategoryError, setShowCategoryError] = useState(false);

  const MAX_INPUT_LENGTH = 80;

  // Popular merchant quick-tags (no icons, text only)
  const quickTags = [
    { key: 'mcdonalds', label: t('quickTags.mcdonalds') },
    { key: 'wellcome', label: t('quickTags.wellcome') },
    { key: 'parknshop', label: t('quickTags.parknshop') },
    { key: 'sushiro', label: t('quickTags.sushiro') },
    { key: 'shell', label: t('quickTags.shell') },
    { key: 'cathay', label: t('quickTags.cathay') },
  ];

  // Parse input in real-time for feedback with debounce and artificial delay
  const handleInputChange = (value: string) => {
    // Enforce max length
    if (value.length > MAX_INPUT_LENGTH) {
      value = value.slice(0, MAX_INPUT_LENGTH);
    }
    setInput(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim()) {
      setIsAnalyzing(true);
      setParseResult(null);

      // Debounce parsing with artificial delay (300ms + 200ms = 500ms total)
      debounceTimerRef.current = setTimeout(() => {
        try {
          let result = parseTransaction(value);
          // Use selected category if no category detected
          if (selectedCategory && !result.transaction.category) {
            result = {
              ...result,
              transaction: {
                ...result.transaction,
                category: selectedCategory,
              },
              confidence: {
                ...result.confidence,
                category: 0.9,
              },
            };
          }
          // Add artificial delay for shimmer effect
          setTimeout(() => {
            setParseResult(result);
            setIsAnalyzing(false);
          }, 200);
        } catch (error) {
          setParseResult(null);
          setIsAnalyzing(false);
        }
      }, 300);
    } else {
      setParseResult(null);
      setIsAnalyzing(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Re-parse when category selection changes
  useEffect(() => {
    if (input.trim()) {
      let result = parseTransaction(input);
      if (selectedCategory && !result.transaction.category) {
        result = {
          ...result,
          transaction: {
            ...result.transaction,
            category: selectedCategory,
          },
          confidence: {
            ...result.confidence,
            category: 0.9,
          },
        };
      }
      setParseResult(result);
    }
  }, [selectedCategory, input]);

  // Select merchant tag (single-select only)
  const handleQuickTag = (tagLabel: string) => {
    if (selectedMerchantTag === tagLabel) {
      // Deselect if clicking the same tag
      setSelectedMerchantTag(null);
      // Remove tag from input
      const inputWithoutTag = input.replace(new RegExp(`\\s*${tagLabel}\\s*`, 'g'), '').trim();
      handleInputChange(inputWithoutTag);
    } else {
      // Select new tag and replace previous selection
      setSelectedMerchantTag(tagLabel);
      // Remove previous tag if exists
      let newInput = input;
      if (selectedMerchantTag) {
        newInput = newInput.replace(new RegExp(`\\s*${selectedMerchantTag}\\s*`, 'g'), '').trim();
      }
      // Add new tag
      newInput = newInput ? `${newInput} ${tagLabel}` : tagLabel;
      handleInputChange(newInput);
    }
  };

  // Call AI to parse activity when no category detected
  const parseActivityWithAI = async (activity: string): Promise<{ category?: string; error?: string; rateLimitSeconds?: number }> => {
    try {
      const response = await fetch('/api/parse-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity }),
      });

      const data = await response.json();

      if (response.status === 429) {
        // Rate limited
        return { error: data.message, rateLimitSeconds: data.retryAfterSeconds };
      }

      if (!response.ok) {
        return { error: data.message || 'Failed to analyze activity' };
      }

      if (data.error) {
        return { error: data.error };
      }

      return { category: data.category };
    } catch (error) {
      console.error('[AI Parse] Error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Check if category is selected (mandatory)
    const hasCategory = selectedCategory || (parseResult?.transaction?.category);
    if (!hasCategory) {
      setShowCategoryError(true);
      setIsCategoryExpanded(true); // Expand category section to show options
      return;
    }
    setShowCategoryError(false);

    setIsProcessing(true);
    setAIState({ isLoading: false });

    try {
      let result = parseTransaction(input);

      // Use selected category if provided and no category was detected
      if (selectedCategory && !result.transaction.category) {
        result = {
          ...result,
          transaction: {
            ...result.transaction,
            category: selectedCategory,
          },
          confidence: {
            ...result.confidence,
            category: 0.9, // User-selected category has high confidence
          },
        };
      }

      await onSubmit(result, selectedRewardType);
    } catch (error) {
      console.error('Parse error:', error);
      setAIState({ isLoading: false, error: t('moreContextNeeded') });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Reward Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-3">
          {t('rewardTypeLabel')}
        </label>
        <div className="flex gap-3">
          {(['cash', 'miles', 'points'] as RewardType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedRewardType(selectedRewardType === type ? undefined : type)}
              className={`flex-1 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                selectedRewardType === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-text-secondary hover:border-primary/50'
              }`}
            >
              {type === 'cash' && '💵'}
              {type === 'miles' && '✈️'}
              {type === 'points' && '⭐'}
              <span className="ml-2">{tRewardTypes(type)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category Selector - Collapsible */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
          className="w-full flex items-center justify-between text-sm font-medium text-text-secondary mb-3 hover:text-text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            {t('categoryLabel')}
            <span className="text-red-500">*</span>
            {selectedCategory && (
              <span className="px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple text-xs">
                {tCategories(selectedCategory)}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showCategoryError && !selectedCategory && (
          <p className="text-xs text-red-500 mb-2">{t('categoryRequired')}</p>
        )}
        {isCategoryExpanded && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TRANSACTION_CATEGORIES) as TransactionCategory[]).map((cat) => {
              const catInfo = TRANSACTION_CATEGORIES[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat ? undefined : cat);
                    setShowCategoryError(false);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                    selectedCategory === cat
                      ? 'bg-text-primary/10 border-text-primary/30 text-text-primary'
                      : 'bg-transparent border-border/60 text-text-secondary hover:border-text-primary/40 hover:text-text-primary'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-4 h-4" />
                  {tCategories(cat)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Tags - Collapsible */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setIsMerchantsExpanded(!isMerchantsExpanded)}
          className="w-full flex items-center justify-between text-sm font-medium text-text-secondary mb-3 hover:text-text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            {t('quickTagsLabel')}
            <span className="text-text-tertiary text-xs">({t('optional')})</span>
            {selectedMerchantTag && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                {selectedMerchantTag}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isMerchantsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isMerchantsExpanded && (
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => (
              <button
                key={tag.key}
                type="button"
                onClick={() => handleQuickTag(tag.label)}
                className={`px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  selectedMerchantTag === tag.label
                    ? 'bg-text-primary/10 border-text-primary/30 text-text-primary'
                    : 'bg-transparent border-border/60 text-text-secondary hover:border-text-primary/40 hover:text-text-primary'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-input-bg border-2 border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow focus-within:border-primary/50">
          {/* Input Field */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t('placeholder')}
              maxLength={MAX_INPUT_LENGTH}
              className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-tertiary focus:outline-none"
              autoFocus
            />
            {/* Character count indicator */}
            {input.length > 0 && (
              <span className={`text-xs tabular-nums flex-shrink-0 ${
                input.length >= MAX_INPUT_LENGTH
                  ? 'text-amber-500'
                  : 'text-text-tertiary'
              }`}>
                {input.length}/{MAX_INPUT_LENGTH}
              </span>
            )}
          </div>

          {/* Real-time Feedback with Shimmer Effect */}
          {(isAnalyzing || (parseResult && parseResult.transaction)) && (
            <div className="mb-4 p-4 bg-surface rounded-xl border border-border">
              {isAnalyzing ? (
                // Shimmer Loading Effect
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="relative overflow-hidden h-16 bg-background-secondary rounded-lg">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground-subtle/10 to-transparent" />
                    </div>
                  ))}
                </div>
              ) : parseResult && parseResult.transaction ? (
                // Detected Information Badges
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Amount Badge */}
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-primary-light rounded-lg border border-primary/20 transition-all hover:border-primary/40">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10">
                      <span className="text-lg">💵</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground-muted mb-0.5">
                        {tResults('detectedAmount')}
                      </div>
                      <div className="text-sm font-bold text-foreground truncate">
                        {parseResult.transaction.currency} ${parseResult.transaction.amount}
                      </div>
                    </div>
                  </div>

                  {/* Merchant Badge */}
                  {parseResult.transaction.merchantId ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-accent-blue-light rounded-lg border border-accent-blue/20 transition-all hover:border-accent-blue/40">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-accent-blue/10">
                        <span className="text-lg">🏪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground-muted mb-0.5">
                          {tResults('detectedMerchant')}
                        </div>
                        <div className="text-sm font-bold text-foreground truncate">
                          {tMerchants(parseResult.transaction.merchantId)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-background-tertiary/50 rounded-lg border border-border-light">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-foreground-subtle/10">
                        <span className="text-lg opacity-50">🏪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground-subtle">
                          {tResults('detectedMerchant')}
                        </div>
                        <div className="text-xs text-foreground-muted italic">
                          {tResults('merchantHint')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Badge */}
                  {parseResult.transaction.category ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-accent-purple-light rounded-lg border border-accent-purple/20 transition-all hover:border-accent-purple/40">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-accent-purple/10">
                        <span className="text-lg">🏷️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground-muted mb-0.5">
                          {tResults('detectedCategory')}
                        </div>
                        <div className="text-sm font-bold text-foreground truncate">
                          {tCategories(parseResult.transaction.category)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-background-tertiary/50 rounded-lg border border-border-light">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-foreground-subtle/10">
                        <span className="text-lg opacity-50">🏷️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground-subtle">
                          {tResults('detectedCategory')}
                        </div>
                        <div className="text-xs text-foreground-muted italic">
                          {tResults('categoryHint')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* AI Error Message */}
          {aiState.error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300">{aiState.error}</p>
                  {aiState.rateLimitSeconds && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {t('rateLimitMessage', { seconds: aiState.rateLimitSeconds })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || aiState.isLoading}
            className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing || aiState.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {aiState.isLoading ? t('aiAnalyzing') : t('analyzing')}
              </span>
            ) : (
              t('submit')
            )}
          </button>

          {/* Example Text */}
          <p className="text-xs text-text-tertiary text-center mt-4">
            {t('exampleText')}
          </p>
        </div>
      </form>
    </div>
  );
}
