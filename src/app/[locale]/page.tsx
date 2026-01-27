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
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import type { ParseResult } from '@/lib/parser/transactionParser';
import type { CardRecommendation } from '@/types/recommendation';
import { recommendCards } from '@/lib/engine';
import { loadCards } from '@/lib/data/loadCards';

type RewardType = 'cash' | 'miles' | 'points';

export default function Home() {
  const t = useTranslations('common');
  const tFeatures = useTranslations('features');
  const tStats = useTranslations('stats');
  const tFooter = useTranslations('footer');
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<CardRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  console.log('recommendations', recommendations);

  const handleSubmit = async (result: ParseResult, selectedRewardType?: RewardType) => {
    setIsLoading(true);
    setShowResults(true);

    try {
      // Load all cards
      const cards = await loadCards();

      // Build user preferences from selected reward type
      const preferences = selectedRewardType
        ? { preferredRewardUnits: [selectedRewardType] }
        : undefined;

      // Get recommendations
      const recommendationResult = recommendCards(
        cards,
        result.transaction,
        preferences
      );

      setRecommendations(recommendationResult.recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Floating Cards Background Animation */}
      <FloatingCards />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Logo size={40} />
              <h1 className="text-xl font-bold text-foreground">
                {t('appName')}
              </h1>
            </div>
            <div className="flex items-center gap-3">
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
            {/* Main Headline */}
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-[#10a37f] via-[#9333ea] to-[#f59e0b] bg-clip-text text-transparent">
                {t('tagline')}
              </span>
            </h2>

            {/* Subtitle - More compelling copy */}
            <p className="text-xl sm:text-2xl text-foreground-muted mb-4 max-w-3xl mx-auto leading-relaxed">
              {t('heroDescription')}
            </p>

            {/* Animated Typing Tagline */}
            <div className="mb-12 min-h-[2rem]">
              <TypingAnimation
                text={t('animatedTagline')}
                className="text-lg sm:text-xl text-primary font-medium"
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

            {/* Enhanced Features Grid */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10a37f]/10 to-[#19c37d]/10 mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{tFeatures('lightningFast')}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {tFeatures('lightningFastDesc')}
                </p>
              </div>

              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333ea]/10 to-[#a855f7]/10 mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-[#9333ea]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{tFeatures('hkCards')}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {tFeatures('hkCardsDesc')}
                </p>
              </div>

              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f59e0b]/10 to-[#fbbf24]/10 mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{tFeatures('smartMatching')}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {tFeatures('smartMatchingDesc')}
                </p>
              </div>

              <div className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6]/10 to-[#60a5fa]/10 mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{tFeatures('bilingual')}</h3>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  {tFeatures('bilingualDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <HowItWorks />

        {/* Social Proof / Stats Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-5xl mx-auto text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">10+</div>
                <div className="text-foreground-muted text-sm">{tStats('creditCards')}</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-[#9333ea] mb-2">100ms</div>
                <div className="text-foreground-muted text-sm">{tStats('analysisTime')}</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-[#f59e0b] mb-2">14</div>
                <div className="text-foreground-muted text-sm">{tStats('categories')}</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold text-[#3b82f6] mb-2">2</div>
                <div className="text-foreground-muted text-sm">{tStats('languages')}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background-secondary py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo size={40} />
                <span className="text-lg font-bold text-foreground">CardGPT</span>
              </div>
              <p className="text-sm text-foreground-muted leading-relaxed">
                {tFooter('description')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{tFooter('quickLinks')}</h4>
              <div className="space-y-2">
                <a href="#" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('howItWorks')}
                </a>
                <a href="#" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('supportedCards')}
                </a>
                <a href="#" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('categories')}
                </a>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{tFooter('legal')}</h4>
              <div className="space-y-2">
                <Link href="/privacy" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('privacy')}
                </Link>
                <Link href="/terms" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('terms')}
                </Link>
                <a href="#" className="block text-sm text-foreground-muted hover:text-primary transition-colors">
                  {tFooter('about')}
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border text-center">
            <p className="text-sm text-foreground-muted">
              {tFooter('copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
