'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Platform = 'ios' | 'android';

export default function InstallPWA() {
  const t = useTranslations('installPWA');
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>('ios');

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-background-secondary">
      <div className="max-w-2xl mx-auto text-center">
        {/* Compact Header with Info Button */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-foreground">
              {t('title')}
            </h2>
            <p className="text-sm text-foreground-muted">
              {t('subtitle')}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="ml-2 w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
            aria-label="Installation instructions"
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <div className="relative bg-background rounded-2xl border border-border shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{t('modalTitle')}</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-background-secondary flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-foreground-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Platform Tabs */}
              <div className="px-6 pt-4">
                <div className="flex rounded-lg bg-background-secondary p-1 border border-border">
                  <button
                    onClick={() => setActivePlatform('ios')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activePlatform === 'ios'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    iOS
                  </button>
                  <button
                    onClick={() => setActivePlatform('android')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activePlatform === 'android'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.15-.5-2.47-.77-3.87-.77s-2.73.27-3.87.77L6.95 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L7.7 9.48C4.75 11.13 2.75 14.06 2.25 17.5h20c-.5-3.44-2.5-6.37-5.45-8.02M7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25m10.5 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25"/>
                    </svg>
                    Android
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="p-6 space-y-4 text-left">
                {activePlatform === 'ios' ? (
                  <>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('ios.step1Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('ios.step1Desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('ios.step2Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('ios.step2Desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('ios.step3Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('ios.step3Desc')}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('android.step1Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('android.step1Desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('android.step2Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('android.step2Desc')}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{t('android.step3Title')}</p>
                        <p className="text-foreground-muted text-xs mt-0.5">{t('android.step3Desc')}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
