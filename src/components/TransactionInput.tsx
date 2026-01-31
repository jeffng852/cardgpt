'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '@/types/transaction';

type RewardType = 'cash' | 'miles' | 'points';

// SVG line icons for categories
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

// Reward type icons (SVG)
const RewardIcon = ({ type, className = "w-5 h-5" }: { type: RewardType; className?: string }) => {
  const icons: Record<RewardType, React.ReactElement> = {
    cash: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    miles: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
    points: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
  };
  return icons[type];
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

  const quickTags = [
    { key: 'mcdonalds', label: t('quickTags.mcdonalds') },
    { key: 'wellcome', label: t('quickTags.wellcome') },
    { key: 'parknshop', label: t('quickTags.parknshop') },
    { key: 'sushiro', label: t('quickTags.sushiro') },
    { key: 'shell', label: t('quickTags.shell') },
    { key: 'cathay', label: t('quickTags.cathay') },
  ];

  const handleInputChange = (value: string) => {
    if (value.length > MAX_INPUT_LENGTH) {
      value = value.slice(0, MAX_INPUT_LENGTH);
    }
    setInput(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim()) {
      setIsAnalyzing(true);
      setParseResult(null);

      debounceTimerRef.current = setTimeout(() => {
        try {
          let result = parseTransaction(value);
          if (selectedCategory && !result.transaction.category) {
            result = {
              ...result,
              transaction: { ...result.transaction, category: selectedCategory },
              confidence: { ...result.confidence, category: 0.9 },
            };
          }
          setTimeout(() => {
            setParseResult(result);
            setIsAnalyzing(false);
          }, 200);
        } catch {
          setParseResult(null);
          setIsAnalyzing(false);
        }
      }, 300);
    } else {
      setParseResult(null);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (input.trim()) {
      let result = parseTransaction(input);
      if (selectedCategory && !result.transaction.category) {
        result = {
          ...result,
          transaction: { ...result.transaction, category: selectedCategory },
          confidence: { ...result.confidence, category: 0.9 },
        };
      }
      setParseResult(result);
    }
  }, [selectedCategory, input]);

  const handleQuickTag = (tagLabel: string) => {
    if (selectedMerchantTag === tagLabel) {
      setSelectedMerchantTag(null);
      const inputWithoutTag = input.replace(new RegExp(`\\s*${tagLabel}\\s*`, 'g'), '').trim();
      handleInputChange(inputWithoutTag);
    } else {
      setSelectedMerchantTag(tagLabel);
      let newInput = input;
      if (selectedMerchantTag) {
        newInput = newInput.replace(new RegExp(`\\s*${selectedMerchantTag}\\s*`, 'g'), '').trim();
      }
      newInput = newInput ? `${newInput} ${tagLabel}` : tagLabel;
      handleInputChange(newInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const hasCategory = selectedCategory || (parseResult?.transaction?.category);
    if (!hasCategory) {
      setShowCategoryError(true);
      setIsCategoryExpanded(true);
      return;
    }
    setShowCategoryError(false);

    setIsProcessing(true);
    setAIState({ isLoading: false });

    try {
      let result = parseTransaction(input);

      if (selectedCategory && !result.transaction.category) {
        result = {
          ...result,
          transaction: { ...result.transaction, category: selectedCategory },
          confidence: { ...result.confidence, category: 0.9 },
        };
      }

      await onSubmit(result, selectedRewardType);
    } catch {
      setAIState({ isLoading: false, error: t('moreContextNeeded') });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Main Input Card - Glass morphism style */}
      <div className="relative">
        {/* Subtle glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-50" />

        <div className="relative backdrop-blur-xl bg-surface/80 border border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Input Section */}
          <form onSubmit={handleSubmit}>
            <div className="p-5">
              {/* Search Input */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t('placeholder')}
                  maxLength={MAX_INPUT_LENGTH}
                  className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-tertiary/60 focus:outline-none font-medium"
                  autoFocus
                />
                {input.length > 0 && (
                  <span className={`text-xs tabular-nums px-2 py-1 rounded-md ${
                    input.length >= MAX_INPUT_LENGTH ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-text-tertiary'
                  }`}>
                    {input.length}/{MAX_INPUT_LENGTH}
                  </span>
                )}
              </div>

              {/* Real-time Detection Feedback */}
              {(isAnalyzing || (parseResult && parseResult.transaction.amount > 0)) && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  {isAnalyzing ? (
                    <div className="flex gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex-1 h-12 rounded-xl bg-white/5 animate-pulse" />
                      ))}
                    </div>
                  ) : parseResult && parseResult.transaction.amount > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {/* Amount Chip */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {parseResult.transaction.currency} ${parseResult.transaction.amount.toLocaleString()}
                      </div>

                      {/* Merchant Chip */}
                      {parseResult.transaction.merchantId && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                          </svg>
                          {tMerchants(parseResult.transaction.merchantId)}
                        </div>
                      )}

                      {/* Category Chip */}
                      {parseResult.transaction.category && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
                          <CategoryIcon category={parseResult.transaction.category as TransactionCategory} className="w-4 h-4" />
                          {tCategories(parseResult.transaction.category)}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="px-5 pb-5">
              <button
                type="submit"
                disabled={!input.trim() || isProcessing || aiState.isLoading}
                className="w-full relative group overflow-hidden rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-emerald-500 transition-all duration-300 group-hover:scale-105" />
                {/* Shine effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%]" style={{ transition: 'transform 0.6s' }} />

                <span className="relative flex items-center justify-center gap-2 px-6 py-3.5">
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      {t('submit')}
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>

          {/* Error Message */}
          {aiState.error && (
            <div className="mx-5 mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-sm text-red-300">{aiState.error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Selection */}
      <div className="backdrop-blur-xl bg-surface/60 border border-white/5 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{t('categoryLabel')}</span>
                <span className="text-red-400 text-xs">*</span>
              </div>
              {selectedCategory && (
                <span className="text-xs text-purple-400">{tCategories(selectedCategory)}</span>
              )}
            </div>
          </div>
          <svg className={`w-5 h-5 text-text-tertiary transition-transform duration-200 ${isCategoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showCategoryError && !selectedCategory && (
          <div className="px-4 pb-2">
            <p className="text-xs text-red-400">{t('categoryRequired')}</p>
          </div>
        )}

        {isCategoryExpanded && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TRANSACTION_CATEGORIES) as TransactionCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat ? undefined : cat);
                    setShowCategoryError(false);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-lg shadow-purple-500/10'
                      : 'bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:border-white/20 hover:text-text-primary'
                  }`}
                >
                  <CategoryIcon category={cat} className="w-4 h-4" />
                  {tCategories(cat)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reward Type Selection */}
      <div className="backdrop-blur-xl bg-surface/60 border border-white/5 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-primary">{t('rewardTypeLabel')}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['cash', 'miles', 'points'] as RewardType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedRewardType(selectedRewardType === type ? undefined : type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                selectedRewardType === type
                  ? 'bg-primary/20 border border-primary/40 text-primary shadow-lg shadow-primary/10'
                  : 'bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:text-text-primary'
              }`}
            >
              <RewardIcon type={type} className="w-5 h-5" />
              <span className="text-xs font-medium">{tRewardTypes(type)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular Merchants */}
      <div className="backdrop-blur-xl bg-surface/60 border border-white/5 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMerchantsExpanded(!isMerchantsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{t('quickTagsLabel')}</span>
                <span className="text-xs text-text-tertiary">({t('optional')})</span>
              </div>
              {selectedMerchantTag && (
                <span className="text-xs text-blue-400">{selectedMerchantTag}</span>
              )}
            </div>
          </div>
          <svg className={`w-5 h-5 text-text-tertiary transition-transform duration-200 ${isMerchantsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isMerchantsExpanded && (
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  onClick={() => handleQuickTag(tag.label)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    selectedMerchantTag === tag.label
                      ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 shadow-lg shadow-blue-500/10'
                      : 'bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 hover:border-white/20 hover:text-text-primary'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-center text-xs text-text-tertiary/60">
        {t('exampleText')}
      </p>
    </div>
  );
}
