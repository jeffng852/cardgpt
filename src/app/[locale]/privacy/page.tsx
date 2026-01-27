'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function PrivacyPage() {
  const t = useTranslations('legal.privacy');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                C
              </div>
              <h1 className="text-xl font-bold text-foreground">CardGPT</h1>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-foreground mb-8">{t('title')}</h1>
        <p className="text-sm text-foreground-muted mb-8">{t('lastUpdated')}</p>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          {/* Section 1 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section1.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section1.content')}</p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section2.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section2.content')}</p>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section3.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section3.content')}</p>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section4.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section4.content')}</p>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section5.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section5.content')}</p>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('section6.title')}</h2>
            <p className="text-foreground-muted leading-relaxed mb-4">{t('section6.content')}</p>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:text-primary-hover transition-colors"
          >
            ← {t('backToHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
