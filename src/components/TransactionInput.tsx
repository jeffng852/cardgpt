'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';
import type { RewardUnit } from '@/types/card';

// Reward preference union — sourced from the shared RewardUnit type so it can
// never desync from the engine (now includes 'crypto').
type RewardType = RewardUnit;

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
      {/* Reward Type Selector — selectable chips (contract §5): white + 1px black
          border; selected → filled neon-yellow, keeping the black border. */}
      <div className="mb-6">
        <label className="block text-[11px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[0.04em] text-muted-fg mb-3">
          {t('rewardTypeLabel')}
        </label>
        <div className="flex gap-3">
          {(['cash', 'miles', 'points'] as RewardType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedRewardType(selectedRewardType === type ? undefined : type)}
              className={`flex-1 px-4 py-3 rounded-[2px] border font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm transition-all ${
                selectedRewardType === type
                  ? 'bg-neon-yellow text-[#121212] border-[#121212]'
                  : 'bg-bg text-fg border-border-strong hover:bg-surface'
              }`}
            >
              {tRewardTypes(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Form — the "describe your purchase" surface */}
      <form onSubmit={handleSubmit}>
        {/* Big square input: white, 2px --border-strong, 2px radius, mint focus
            outline (contract §5 inputs — the simulator's heavier main input). */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t('placeholder')}
            maxLength={MAX_INPUT_LENGTH}
            className="w-full bg-bg border-2 border-border-strong rounded-[2px] px-4 py-4 pr-16 text-base text-fg placeholder:text-muted-fg focus:outline focus:outline-2 focus:outline-brand focus:outline-offset-0"
            autoFocus
          />
          {/* Character count indicator — at-limit turns --destructive (was amber) */}
          {input.length > 0 && (
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-[family-name:var(--font-mono)] tabular-nums ${
              input.length >= MAX_INPUT_LENGTH ? 'text-destructive' : 'text-muted-fg'
            }`}>
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          )}
        </div>

        {/* Real-time Feedback — hairline surfaces, monochrome + a single mint accent */}
        {(isAnalyzing || (parseResult && parseResult.transaction)) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isAnalyzing ? (
              // Shimmer Loading Effect
              [1, 2, 3].map((i) => (
                <div key={i} className="relative overflow-hidden h-16 bg-surface border border-border rounded-[2px]">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-fg/10 to-transparent" />
                </div>
              ))
            ) : parseResult && parseResult.transaction ? (
              // Detected Information Badges
              <>
                {/* Amount */}
                <div className="bg-surface border border-border rounded-[2px] px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-fg mb-1">
                    {tResults('detectedAmount')}
                  </div>
                  <div className="font-[family-name:var(--font-mono)] text-sm font-bold tabular-nums text-badge-crypto truncate">
                    {parseResult.transaction.currency} ${parseResult.transaction.amount}
                  </div>
                </div>

                {/* Merchant */}
                <div className="bg-surface border border-border rounded-[2px] px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-fg mb-1">
                    {tResults('detectedMerchant')}
                  </div>
                  {parseResult.transaction.merchantId ? (
                    <div className="font-[family-name:var(--font-mono)] text-sm font-bold text-fg truncate">
                      {tMerchants(parseResult.transaction.merchantId)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-fg italic">{tResults('merchantHint')}</div>
                  )}
                </div>

                {/* Category */}
                <div className="bg-surface border border-border rounded-[2px] px-3 py-2.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-fg mb-1">
                    {tResults('detectedCategory')}
                  </div>
                  {parseResult.transaction.category ? (
                    <div className="font-[family-name:var(--font-mono)] text-sm font-bold text-fg truncate">
                      {tCategories(parseResult.transaction.category)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-fg italic">{tResults('categoryHint')}</div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* AI Error Message — hairline --destructive treatment */}
        {aiState.error && (
          <div className="mt-4 p-3 bg-bg border border-destructive rounded-[2px]">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-destructive">{aiState.error}</p>
                {aiState.rateLimitSeconds && (
                  <p className="text-xs text-destructive/80 mt-1">
                    {t('rateLimitMessage', { seconds: aiState.rateLimitSeconds })}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button — mint fill + 1.5px #121212 border, 2px radius, uppercase display */}
        <button
          type="submit"
          disabled={!input.trim() || isProcessing || aiState.isLoading}
          className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand text-[#121212] border-[1.5px] border-[#121212] rounded-[2px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing || aiState.isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {aiState.isLoading ? t('aiAnalyzing') : t('analyzing')}
            </>
          ) : (
            <>
              {t('submit')}
              <span aria-hidden>→</span>
            </>
          )}
        </button>

        {/* Example Text */}
        <p className="text-xs text-muted-fg text-center mt-3">
          {t('exampleText')}
        </p>
      </form>

      {/* Quick Tags — selectable example chips (contract §5): white + 1px black
          border; selected → filled neon-cyan, keeping the black border. */}
      <div className="mt-6">
        <label className="block text-[11px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[0.04em] text-muted-fg mb-3">
          {t('quickTagsLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {quickTags.map((tag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => handleQuickTag(tag.label)}
              className={`px-3 py-2 rounded-[2px] border text-sm font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] transition-all ${
                selectedMerchantTag === tag.label
                  ? 'bg-neon-cyan text-[#121212] border-[#121212]'
                  : 'bg-bg text-fg border-border-strong hover:bg-surface'
              }`}
            >
              <span className="mr-1.5">{tag.icon}</span>
              {tag.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
