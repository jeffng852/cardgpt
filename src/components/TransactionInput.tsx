'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';

type RewardType = 'cash' | 'miles' | 'points';

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
  const [selectedMerchantTag, setSelectedMerchantTag] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiState, setAIState] = useState<AIParseState>({ isLoading: false });
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_INPUT_LENGTH = 80;

  // Popular merchant quick-tags
  const quickTags = [
    { key: 'mcdonalds', label: t('quickTags.mcdonalds'), icon: '🍔' },
    { key: 'wellcome', label: t('quickTags.wellcome'), icon: '🛒' },
    { key: 'parknshop', label: t('quickTags.parknshop'), icon: '🛒' },
    { key: 'sushiro', label: t('quickTags.sushiro'), icon: '🍣' },
    { key: 'shell', label: t('quickTags.shell'), icon: '⛽' },
    { key: 'cathay', label: t('quickTags.cathay'), icon: '✈️' },
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
          const result = parseTransaction(value);
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

    setIsProcessing(true);
    setAIState({ isLoading: false });

    try {
      let result = parseTransaction(input);

      // If no category detected and we have an amount, try AI parsing
      if (!result.transaction.category && result.confidence.amount > 0) {
        setAIState({ isLoading: true });

        const aiResult = await parseActivityWithAI(input);

        if (aiResult.error) {
          setAIState({
            isLoading: false,
            error: aiResult.error,
            rateLimitSeconds: aiResult.rateLimitSeconds,
          });
          setIsProcessing(false);
          return;
        }

        if (aiResult.category) {
          // Update the result with AI-detected category
          result = {
            ...result,
            transaction: {
              ...result.transaction,
              category: aiResult.category,
            },
            confidence: {
              ...result.confidence,
              category: 0.7, // AI-detected category has medium-high confidence
            },
          };
          setAIState({
            isLoading: false,
            detectedCategory: aiResult.category,
          });
        }
      }

      await onSubmit(result, selectedRewardType);
    } catch (error) {
      console.error('Parse error:', error);
      setAIState({ isLoading: false, error: 'Something went wrong. Please try again.' });
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

      {/* Quick Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-secondary mb-3">
          {t('quickTagsLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {quickTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => handleQuickTag(tag.label)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                selectedMerchantTag === tag.label
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-input-bg border-border text-text-primary hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <span className="mr-1">{tag.icon}</span>
              {tag.label}
            </button>
          ))}
        </div>
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
