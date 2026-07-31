'use client';

/**
 * ResearchClient — the public Research explainer (Phase 10, RES-01).
 *
 * Client component rendering the v2 chrome (sticky hairline header with the Logo
 * home-link, a Directory link, the Research affordance in its active mint-filled
 * state, DarkModeToggle + LanguageSwitcher) over an editorial long-form reading
 * layout. Every visible string reads from the next-intl `research` namespace so
 * both locales render with full parity and dark mode flips for free via the
 * next-themes `.dark` class — tokens only, no hardcoded colors (D-04/D-06).
 *
 * This is a STATIC content page: no engine or data-layer call. The ranking copy
 * is authored to match `recommendCards.ts` + `transactionParser.ts` (D-01) —
 * plain-language but true, no invented marketing. Plan 10-02 expands the ranking
 * section body and adds the crypto-valuation explainer.
 */

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ResearchClient() {
  const t = useTranslations('research');

  // Ordered tie-break steps rendered as a parallel array so en/zh-HK hold
  // key/index parity (accurate to recommendCards.ts, lines ~125-154).
  const tieBreakSteps = t.raw('ranking.tieBreak.steps') as string[];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      {/* Header — hairline-bottom bar, flat (contract §3/§5), mirrors HomeClient */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Logo size={34} />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/cards"
                className="h-10 inline-flex items-center px-3 rounded-[2px] border border-border bg-bg text-fg font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm hover:bg-surface transition-colors focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {t('directoryNavLink')}
              </Link>
              {/* Research is the current view → active mint-filled state (contract §5
                  nav rule). Mint is a light fill in both themes, so its label stays
                  near-black in both. aria-current marks the active nav item. */}
              <span
                aria-current="page"
                className="h-10 inline-flex items-center px-3 rounded-[2px] border-[1.5px] border-border-strong bg-brand text-[#0b0b0b] font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm"
              >
                {t('navLink')}
              </span>
              <DarkModeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main — editorial reading layout: constrained prose measure inside the
          7xl frame, uppercase Rethink display headings + Inter body (contract §2). */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="max-w-3xl">
            {/* Page eyebrow — uppercase micro label (contract §2) */}
            <p className="font-[family-name:var(--font-display)] font-bold uppercase text-[11px] tracking-[0.08em] text-muted-fg">
              {t('pageEyebrow')}
            </p>

            {/* Page title — uppercase display (contract §2) */}
            <h1 className="mt-3 font-display font-extrabold uppercase text-fg tracking-[-0.03em] leading-[1.02] text-4xl sm:text-5xl text-balance">
              {t('pageTitle')}
            </h1>

            {/* Lead intro — Inter, comfortable measure */}
            <p className="mt-6 font-sans text-[17px] leading-relaxed text-muted-fg">
              {t('pageIntro')}
            </p>

            {/* Ranking methodology — hairline-separated section, accurate to
                recommendCards.ts + transactionParser.ts (D-01, no invented claims) */}
            <section className="mt-12 pt-10 border-t border-border">
              <h2 className="font-display font-extrabold uppercase text-fg tracking-[-0.02em] leading-[1.05] text-2xl sm:text-3xl text-balance">
                {t('ranking.heading')}
              </h2>
              <p className="mt-5 font-sans text-[16px] leading-relaxed text-fg">
                {t('ranking.lead')}
              </p>

              {/* Sub-blocks — each an uppercase Rethink sub-heading + Inter body */}
              <div className="mt-10 space-y-10">
                <div>
                  <h3 className="font-display font-bold uppercase text-fg tracking-[-0.01em] text-lg">
                    {t('ranking.parsing.heading')}
                  </h3>
                  <p className="mt-3 font-sans text-[16px] leading-relaxed text-muted-fg">
                    {t('ranking.parsing.body')}
                  </p>
                </div>

                <div>
                  <h3 className="font-display font-bold uppercase text-fg tracking-[-0.01em] text-lg">
                    {t('ranking.netValue.heading')}
                  </h3>
                  <p className="mt-3 font-sans text-[16px] leading-relaxed text-muted-fg">
                    {t('ranking.netValue.body')}
                  </p>
                  {/* FX-fee worked example — bordered aside (flat, hairline §3) */}
                  <p className="mt-4 border-l-2 border-border-strong bg-muted px-4 py-3 font-sans text-[15px] leading-relaxed text-fg">
                    {t('ranking.netValue.example')}
                  </p>
                </div>

                <div>
                  <h3 className="font-display font-bold uppercase text-fg tracking-[-0.01em] text-lg">
                    {t('ranking.tieBreak.heading')}
                  </h3>
                  <p className="mt-3 font-sans text-[16px] leading-relaxed text-muted-fg">
                    {t('ranking.tieBreak.lead')}
                  </p>
                  {/* Ordered tie-break chain — parallel array holds en/zh parity */}
                  <ol className="mt-4 space-y-2">
                    {tieBreakSteps.map((step, i) => (
                      <li key={i} className="flex gap-3 font-sans text-[16px] leading-relaxed text-fg">
                        <span className="font-[family-name:var(--font-mono)] font-bold tabular-nums text-muted-fg shrink-0">
                          {i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="font-display font-bold uppercase text-fg tracking-[-0.01em] text-lg">
                    {t('ranking.preferences.heading')}
                  </h3>
                  <p className="mt-3 font-sans text-[16px] leading-relaxed text-muted-fg">
                    {t('ranking.preferences.body')}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer — hairline top rule, monochrome, flat (contract §3) */}
      <footer className="border-t border-border bg-bg py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="font-sans text-sm text-muted-fg">{t('footerNote')}</p>
        </div>
      </footer>
    </div>
  );
}
