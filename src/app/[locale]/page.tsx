'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TransactionInput from '@/components/TransactionInput';
import type { ParsedTransactionResult } from '@/lib/parser/transactionParser';

type RewardType = 'cash' | 'miles' | 'points';

export default function Home() {
  const t = useTranslations('common');
  const [showResults, setShowResults] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [rewardType, setRewardType] = useState<RewardType | undefined>();

  const handleSubmit = async (result: ParsedTransactionResult, selectedRewardType?: RewardType) => {
    setParsedResult(result);
    setRewardType(selectedRewardType);
    setShowResults(true);

    // TODO: THI-17 - Replace this with actual results display
    // For now, just scroll to show the parsed result
    console.log('Parsed transaction:', result);
    console.log('Selected reward type:', selectedRewardType);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-text-primary">
              {t('appName')}
            </h1>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto text-center">
            {/* Tagline */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-6 tracking-tight">
              {t('tagline')}
            </h2>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>

            {/* Transaction Input Interface (THI-16) */}
            <TransactionInput onSubmit={handleSubmit} />

            {/* Temporary debug output - will be replaced in THI-17 */}
            {showResults && parsedResult && (
              <div className="mt-8 p-6 bg-surface border border-border rounded-2xl">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  ✅ Transaction Parsed Successfully
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-text-tertiary">Amount: </span>
                    <span className="text-text-primary font-medium">
                      {parsedResult.transaction.currency} ${parsedResult.transaction.amount}
                    </span>
                  </div>
                  {parsedResult.transaction.category && (
                    <div>
                      <span className="text-text-tertiary">Category: </span>
                      <span className="text-text-primary font-medium">
                        {parsedResult.transaction.category}
                      </span>
                    </div>
                  )}
                  {parsedResult.transaction.merchantId && (
                    <div>
                      <span className="text-text-tertiary">Merchant: </span>
                      <span className="text-text-primary font-medium">
                        {parsedResult.transaction.merchantId}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-tertiary">Payment Type: </span>
                    <span className="text-text-primary font-medium">
                      {parsedResult.transaction.paymentType}
                    </span>
                  </div>
                  {rewardType && (
                    <div>
                      <span className="text-text-tertiary">Preferred Reward: </span>
                      <span className="text-text-primary font-medium capitalize">
                        {rewardType}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-text-tertiary">Confidence: </span>
                    <span className="text-primary font-medium">
                      {(parsedResult.confidence.overall * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary mt-4">
                  🚧 Card recommendations will be shown here in THI-17
                </p>
              </div>
            )}

            {/* Features Grid */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Instant Analysis</h3>
                <p className="text-sm text-text-secondary">
                  Get recommendations in milliseconds
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary mb-1">10 HK Cards</h3>
                <p className="text-sm text-text-secondary">
                  Compare top Hong Kong credit cards
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary mb-1">Bilingual</h3>
                <p className="text-sm text-text-secondary">
                  English & Traditional Chinese
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-text-tertiary">
            <p>
              © 2026 CardGPT. Powered by AI.
            </p>
            <div className="flex gap-6">
              <a
                href="#"
                className="hover:text-text-secondary transition-colors"
              >
                About
              </a>
              <a
                href="#"
                className="hover:text-text-secondary transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-text-secondary transition-colors"
              >
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
