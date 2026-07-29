'use client';

import { useTranslations } from 'next-intl';

export default function HowItWorks() {
  const t = useTranslations('howItWorks');

  const steps = [
    {
      number: 1,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      title: t('step1Title'),
      description: t('step1Description'),
    },
    {
      number: 2,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
      title: t('step2Title'),
      description: t('step2Description'),
    },
    {
      number: 3,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: t('step3Title'),
      description: t('step3Description'),
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-surface border-t border-border">
      <div className="max-w-6xl mx-auto">
        {/* Section Header — uppercase display (contract §2) */}
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-[30px] font-[family-name:var(--font-display)] font-extrabold uppercase tracking-[-0.03em] text-fg mb-4 text-balance">
            {t('title')}
          </h2>
          <p className="text-base sm:text-lg text-muted-fg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Steps — flat square hairline cards (contract §3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-bg border border-border rounded-none p-8"
            >
              {/* Step Number — single mint accent (contract §1/§3) */}
              <div className="absolute top-0 right-0 w-10 h-10 bg-brand text-[#121212] border-l border-b border-[#121212] flex items-center justify-center font-[family-name:var(--font-display)] font-extrabold text-lg tabular-nums">
                {step.number}
              </div>

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-14 h-14 bg-muted border border-border rounded-none mb-6 text-fg">
                {step.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.02em] text-fg mb-3 text-balance">
                {step.title}
              </h3>
              <p className="text-muted-fg leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-fg mb-4">
            {t('ctaText')}
          </p>
          <button
            onClick={() => {
              const inputSection = document.querySelector('input[type="text"]');
              inputSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (inputSection as HTMLInputElement)?.focus();
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand text-[#121212] border-[1.5px] border-[#121212] rounded-[2px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm hover:brightness-95 transition-all"
          >
            {t('tryNow')}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
