'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';
import { TRANSACTION_CATEGORIES, type TransactionCategory } from '@/types/transaction';

type RewardType = 'cash' | 'miles' | 'points';

// SVG Icons
const CategoryIcon = ({ category, className = "w-4 h-4" }: { category: TransactionCategory; className?: string }) => {
  const icons: Record<TransactionCategory, React.ReactElement> = {
    groceries: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>,
    dining: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-4.5a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    online: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>,
    travel: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>,
    transport: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
    overseas: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
    utilities: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
    financial: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
    government: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>,
    'digital-wallet': <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>,
    others: <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
  };
  return icons[category];
};

const ChevronDown = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// Dropdown Component
interface DropdownProps<T extends string> {
  label: string;
  value: T | undefined;
  options: { key: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T | undefined) => void;
  required?: boolean;
  error?: boolean;
  placeholder?: string;
}

function Dropdown<T extends string>({ label, value, options, onChange, required, error, placeholder }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.key === value);
  const displayText = selectedOption ? selectedOption.label : (placeholder || label);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium
          transition-all duration-200 whitespace-nowrap
          ${value
            ? 'bg-primary/15 text-primary border border-primary/30'
            : error
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-white/10 text-text-secondary border border-white/10 hover:bg-white/15 hover:text-text-primary'
          }
        `}
      >
        {selectedOption?.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
        <span>{displayText}</span>
        {required && !value && <span className="text-red-400">*</span>}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[220px]
          bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/30 z-50
          animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(undefined); setIsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:bg-white/10 transition-colors"
              >
                Clear selection
              </button>
            )}
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => { onChange(option.key); setIsOpen(false); }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                  ${value === option.key
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-primary hover:bg-white/10'
                  }
                `}
              >
                {option.icon && <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{option.icon}</span>}
                <span className="flex-1 text-left">{option.label}</span>
                {value === option.key && <CheckIcon className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TransactionInputProps {
  onSubmit: (result: ParseResult, rewardType?: RewardType) => void;
}

interface AIParseState {
  isLoading: boolean;
  error?: string;
  rateLimitSeconds?: number;
}

export default function TransactionInput({ onSubmit }: TransactionInputProps) {
  const t = useTranslations('input');
  const tCategories = useTranslations('categories');
  const tRewardTypes = useTranslations('rewardTypes');
  const [input, setInput] = useState('');
  const [selectedRewardType, setSelectedRewardType] = useState<RewardType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | undefined>();
  const [selectedMerchant, setSelectedMerchant] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiState, setAIState] = useState<AIParseState>({ isLoading: false });
  const [showCategoryError, setShowCategoryError] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_INPUT_LENGTH = 80;

  // Category options
  const categoryOptions = (Object.keys(TRANSACTION_CATEGORIES) as TransactionCategory[]).map((cat) => ({
    key: cat,
    label: tCategories(cat),
    icon: <CategoryIcon category={cat} className="w-4 h-4" />,
  }));

  // Reward type options
  const rewardOptions: { key: RewardType; label: string; icon: React.ReactNode }[] = [
    { key: 'cash', label: tRewardTypes('cash'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { key: 'miles', label: tRewardTypes('miles'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg> },
    { key: 'points', label: tRewardTypes('points'), icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> },
  ];

  // Merchant options
  const merchantOptions = [
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
          }, 150);
        } catch {
          setParseResult(null);
          setIsAnalyzing(false);
        }
      }, 200);
    } else {
      setParseResult(null);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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

  // Update input when merchant is selected
  useEffect(() => {
    if (selectedMerchant) {
      const merchantLabel = merchantOptions.find(m => m.key === selectedMerchant)?.label;
      if (merchantLabel && !input.includes(merchantLabel)) {
        const newInput = input ? `${input} ${merchantLabel}` : merchantLabel;
        handleInputChange(newInput);
      }
    }
  }, [selectedMerchant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const hasCategory = selectedCategory || parseResult?.transaction?.category;
    if (!hasCategory) {
      setShowCategoryError(true);
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
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Card */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-3xl blur-lg opacity-60" />

        <div className="relative bg-surface/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/20">
          <form onSubmit={handleSubmit}>
            {/* Input Area */}
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={t('placeholder')}
                  maxLength={MAX_INPUT_LENGTH}
                  className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-tertiary/50 focus:outline-none font-medium"
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
            </div>

            {/* Filter Bar - Canva Style */}
            <div className="px-5 pb-4">
              <div className="flex flex-wrap items-center gap-2 p-3 -mx-1 bg-primary/5 rounded-xl border border-primary/10">
                <Dropdown
                  label={t('categoryLabel')}
                  value={selectedCategory}
                  options={categoryOptions}
                  onChange={(val) => { setSelectedCategory(val); setShowCategoryError(false); }}
                  required
                  error={showCategoryError}
                  placeholder={t('categoryLabel')}
                />
                <Dropdown
                  label={t('rewardTypeLabel')}
                  value={selectedRewardType}
                  options={rewardOptions}
                  onChange={setSelectedRewardType}
                  placeholder={t('rewardsPlaceholder')}
                />
                <Dropdown
                  label={t('quickTagsLabel')}
                  value={selectedMerchant}
                  options={merchantOptions}
                  onChange={setSelectedMerchant}
                  placeholder={t('quickTagsLabel')}
                />
              </div>

              {showCategoryError && (
                <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {t('categoryRequired')}
                </p>
              )}
            </div>

            {/* Detection Feedback */}
            {(isAnalyzing || (parseResult && parseResult.transaction.amount > 0)) && (
              <div className="px-5 pb-4">
                <div className="flex flex-wrap gap-2">
                  {isAnalyzing ? (
                    <>
                      <div className="h-7 w-24 rounded-full bg-white/5 animate-pulse" />
                      <div className="h-7 w-20 rounded-full bg-white/5 animate-pulse" />
                    </>
                  ) : parseResult && parseResult.transaction.amount > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-sm font-medium border border-emerald-500/20">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {parseResult.transaction.currency} ${parseResult.transaction.amount.toLocaleString()}
                      </span>
                      {parseResult.transaction.category && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 text-sm font-medium border border-purple-500/20">
                          <CategoryIcon category={parseResult.transaction.category as TransactionCategory} className="w-3.5 h-3.5" />
                          {tCategories(parseResult.transaction.category)}
                        </span>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="px-5 pb-5">
              <button
                type="submit"
                disabled={!input.trim() || isProcessing || aiState.isLoading}
                className="w-full relative group overflow-hidden rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-emerald-500 transition-all duration-300 group-hover:scale-[1.02]" />
                <span className="relative flex items-center justify-center gap-2 px-6 py-3.5">
                  {isProcessing || aiState.isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('analyzing')}
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
            <div className="mx-5 mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm text-red-300 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {aiState.error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
