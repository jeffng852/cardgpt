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
      accentColor: 'bg-gradient-to-br from-[#9333ea] to-[#c084fc]',
      accentLight: 'bg-[#f3e8ff]',
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
      accentColor: 'bg-gradient-to-br from-[#f59e0b] to-[#fbbf24]',
      accentLight: 'bg-[#fef3c7]',
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
      accentColor: 'bg-gradient-to-br from-[#10a37f] to-[#19c37d]',
      accentLight: 'bg-[#e6f7f2]',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#9333ea]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t('title')}
          </h2>
          <p className="text-lg sm:text-xl text-foreground-muted max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative group"
            >
              {/* Connecting line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border z-0">
                  <div className="absolute right-0 -top-1 w-3 h-3 bg-border rotate-45"></div>
                </div>
              )}

              {/* Step Card */}
              <div className="relative bg-card-bg border-2 border-border rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group-hover:-translate-y-1">
                {/* Step Number Badge */}
                <div className={`absolute -top-4 -left-4 w-12 h-12 ${step.accentColor} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 ${step.accentLight} rounded-xl mb-6 text-foreground`}>
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-foreground-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-foreground-muted mb-4">
            {t('ctaText')}
          </p>
          <button
            onClick={() => {
              const inputSection = document.querySelector('input[type="text"]');
              inputSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              (inputSection as HTMLInputElement)?.focus();
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors shadow-lg hover:shadow-xl"
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
