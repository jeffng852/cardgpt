'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import DarkModeToggle from '@/components/DarkModeToggle';
import TypingAnimation from '@/components/TypingAnimation';
import TransactionInput from '@/components/TransactionInput';
import CardRecommendationList from '@/components/CardRecommendationList';
import FloatingCards from '@/components/FloatingCards';
import HowItWorks from '@/components/HowItWorks';
import InstallPWA from '@/components/InstallPWA';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import type { ParseResult } from '@/lib/parser/transactionParser';
import type { CardRecommendation } from '@/types/recommendation';
import type { CreditCard, RewardUnit, HkdRateTable } from '@/types/card';
import { recommendCards } from '@/lib/engine';

// Sourced from the shared RewardUnit type so a crypto preference typechecks
// against the widened engine union (now includes 'crypto').
type RewardType = RewardUnit;

interface HomeClientProps {
  cards: CreditCard[];
  /**
   * Optional crypto→HKD rate table read server-side (DEC-DATA-002). Threaded as
   * the 4th arg to recommendCards; optional at every hop so a missing table (no
   * Redis key / dev) leaves the fiat path byte-identical (Phase 7 additive contract).
   */
  rateTable?: HkdRateTable;
}

export default function HomeClient({ cards, rateTable }: HomeClientProps) {
  const t = useTranslations('common');
  const tFeatures = useTranslations('features');
  const tFooter = useTranslations('footer');
  const tDirectory = useTranslations('directory');
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<CardRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (result: ParseResult, selectedRewardType?: RewardType) => {
    setIsLoading(true);
    setShowResults(true);

    // Build user preferences from selected reward type
    const preferences = selectedRewardType
      ? { preferredRewardUnits: [selectedRewardType] }
      : undefined;

    // Get recommendations (sync - cards already loaded). rateTable is the
    // optional 4th arg: when present the engine values crypto cards in HKD; when
    // absent the call is the unchanged 3-arg fiat path (Phase 7 additive contract).
    const recommendationResult = recommendCards(
      cards,
      result.transaction,
      preferences,
      rateTable
    );

    setRecommendations(recommendationResult.recommendations);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg relative">
      {/* Floating Cards Background Animation */}
      <FloatingCards />

      {/* Header — hairline-bottom bar, flat (contract §3/§5) */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* The wordmark already renders the brand name; appName kept as the
                  page's sr-only h1 so the i18n key + document heading are preserved. */}
              <h1 className="sr-only">{t('appName')}</h1>
              <Logo size={34} />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/cards"
                className="h-10 inline-flex items-center px-3 rounded-[2px] border border-border bg-bg text-fg font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm hover:bg-surface transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {tDirectory('navLink')}
              </Link>
              <DarkModeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline — flat uppercase display, Rethink 800 (contract §2) */}
            <h2
              className="font-display font-extrabold uppercase text-fg mb-6"
              style={{
                fontSize: 'clamp(38px, 7vw, 62px)',
                letterSpacing: '-0.03em',
                lineHeight: 1.02,
                textWrap: 'balance',
              }}
            >
              {t('tagline')}
            </h2>

            {/* Subtitle — Inter lead, secondary text */}
            <p className="font-sans text-[17px] sm:text-[19px] text-muted-fg mb-4 max-w-3xl mx-auto leading-relaxed">
              {t('heroDescription')}
            </p>

            {/* Animated Typing Tagline - Cycles through multiple taglines */}
            <div className="mb-12 min-h-[2rem]">
              <TypingAnimation
                texts={t.raw('animatedTaglines') as string[]}
                className="font-display uppercase tracking-tight text-base sm:text-lg text-fg font-bold"
              />
            </div>

            {/* Transaction Input Interface (THI-16) */}
            <TransactionInput onSubmit={handleSubmit} />

            {/* Card Recommendations Display (THI-17) */}
            {showResults && (
              <CardRecommendationList
                recommendations={recommendations}
                isLoading={isLoading}
              />
            )}

            {/* Features grid — flat square hairline cells (contract §3), no gradients/shadows */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-border text-left">
              {[
                { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: tFeatures('lightningFast'), desc: tFeatures('lightningFastDesc') },
                { icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', title: tFeatures('hkCards'), desc: tFeatures('hkCardsDesc') },
                { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', title: tFeatures('smartMatching'), desc: tFeatures('smartMatchingDesc') },
                { icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', title: tFeatures('bilingual'), desc: tFeatures('bilingualDesc') },
              ].map((f) => (
                <div key={f.title} className="border-r border-b border-border p-6 sm:p-7 bg-bg">
                  <svg className="w-6 h-6 text-fg mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                  <h3 className="font-display font-bold uppercase tracking-tight text-fg mb-2 text-base">{f.title}</h3>
                  <p className="font-sans text-sm text-muted-fg leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <HowItWorks />

        {/* Install PWA Section */}
        <InstallPWA />
      </main>

      {/* Footer — hairline top rule, monochrome, flat (contract §3) */}
      <footer className="border-t border-border bg-bg py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size={34} />
              </div>
              <p className="font-sans text-sm text-muted-fg leading-relaxed">
                {tFooter('description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-bold uppercase tracking-tight text-fg mb-4 text-sm">{tFooter('quickLinks')}</h4>
              <div className="space-y-2 font-sans">
                <a href="#" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('howItWorks')}
                </a>
                <a href="#" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('supportedCards')}
                </a>
                <a href="#" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('categories')}
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display font-bold uppercase tracking-tight text-fg mb-4 text-sm">{tFooter('legal')}</h4>
              <div className="space-y-2 font-sans">
                <Link href="/privacy" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('privacy')}
                </Link>
                <Link href="/terms" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('terms')}
                </Link>
                <a href="#" className="block text-sm text-muted-fg hover:text-fg transition-colors">
                  {tFooter('about')}
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border text-center">
            <p className="font-sans text-sm text-muted-fg">
              {tFooter('copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
