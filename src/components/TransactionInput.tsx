'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { parseTransaction } from '@/lib/parser/transactionParser';
import type { ParseResult } from '@/lib/parser/transactionParser';

type RewardType = 'cash' | 'miles' | 'points';

interface TransactionInputProps {
  onSubmit: (result: ParseResult, rewardType?: RewardType) => void;
}

export default function TransactionInput({ onSubmit }: TransactionInputProps) {
  const t = useTranslations('input');
  const tResults = useTranslations('results');
  const tMerchants = useTranslations('merchants');
  const tRewardTypes = useTranslations('rewardTypes');
  const [input, setInput] = useState('');
  const [selectedRewardType, setSelectedRewardType] = useState<RewardType | undefined>();
  const [selectedMerchantTag, setSelectedMerchantTag] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Popular merchant quick-tags
  const quickTags = [
    { key: 'mcdonalds', label: t('quickTags.mcdonalds'), icon: '🍔' },
    { key: 'wellcome', label: t('quickTags.wellcome'), icon: '🛒' },
    { key: 'parknshop', label: t('quickTags.parknshop'), icon: '🛒' },
    { key: 'sushiro', label: t('quickTags.sushiro'), icon: '🍣' },
    { key: 'shell', label: t('quickTags.shell'), icon: '⛽' },
    { key: 'cathay', label: t('quickTags.cathay'), icon: '✈️' },
  ];

  // Parse input in real-time for feedback
  const handleInputChange = (value: string) => {
    setInput(value);

    if (value.trim()) {
      try {
        const result = parseTransaction(value);
        setParseResult(result);
      } catch (error) {
        setParseResult(null);
      }
    } else {
      setParseResult(null);
    }
  };

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

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    setIsProcessing(true);

    try {
      const result = parseTransaction(input);
      await onSubmit(result, selectedRewardType);
    } catch (error) {
      console.error('Parse error:', error);
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
              className="flex-1 bg-transparent text-lg text-text-primary placeholder:text-text-tertiary focus:outline-none"
              autoFocus
            />
          </div>

          {/* Real-time Feedback */}
          {parseResult && parseResult.transaction && (
            <div className="mb-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{tResults('detectedAmount')}:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-text-tertiary">{tResults('detectedAmount')}: </span>
                  <span className="text-text-primary font-medium">
                    {parseResult.transaction.currency} ${parseResult.transaction.amount}
                  </span>
                </div>
                {parseResult.transaction.category && (
                  <div>
                    <span className="text-text-tertiary">{tResults('detectedCategory')}: </span>
                    <span className="text-text-primary font-medium capitalize">
                      {parseResult.transaction.category}
                    </span>
                  </div>
                )}
                {parseResult.transaction.merchantId && (
                  <div>
                    <span className="text-text-tertiary">{tResults('detectedMerchant')}: </span>
                    <span className="text-text-primary font-medium">
                      {tMerchants(parseResult.transaction.merchantId)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
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
