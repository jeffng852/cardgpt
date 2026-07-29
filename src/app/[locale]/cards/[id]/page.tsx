/**
 * Card detail route — /[locale]/cards/[id] (Phase 9, DIR-01 / D-02).
 *
 * A read-only, server-rendered, shareable/SEO-friendly detail page for a single
 * card. Loads the card via the existing `getCardById(id)` (reads Redis in
 * production) and calls `notFound()` for an unknown id — never a crash or blank
 * page. It makes NO recommendation-engine call: the directory + detail surfaces
 * rank nothing.
 *
 * Built in the v2 brutalist-editorial system (ui-contract-v2.md): square/flat,
 * 1px hairlines, uppercase display headings, Geist Mono tabular values. Mirrors
 * the CardDirectoryClient header chrome (Logo home link, DarkModeToggle,
 * LanguageSwitcher) plus a back-to-directory link.
 *
 * The apply CTA reuses `applyCtaProps` (the locked D-05 rel triplet); a card
 * with no applyUrl shows the "no apply link" line instead of an anchor (AFF-01).
 *
 * Provenance labels (HK-availability + last-verified + note) live in the
 * provenance block below (DIR-02 / 09-CONTEXT D-04).
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { getCardById, getDatabaseMetadata } from '@/lib/data/loadCards';
import { applyCtaProps } from '@/lib/affiliate/applyCtaProps';
import { getCardImageUrl, hasCardImage } from '@/lib/cardImages';
import type { CreditCard, RewardRule } from '@/types/card';

// Read-only, data-backed page — render dynamically so it reflects live Redis
// card data in production (mirrors the home + directory server pages).
export const dynamic = 'force-dynamic';

interface CardDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

/** SEO / shareability: title the page after the card (falls back to the app title). */
export async function generateMetadata({ params }: CardDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await getCardById(id);
  if (!card) return {};
  return {
    title: `${card.name} — CardGPT`,
    description: `${card.name} (${card.issuer}) — reward rules, fees, and how to apply.`,
  };
}

function issuerInitials(issuer: string): string {
  return issuer
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Rate as a percentage, mirroring CardRecommendationList's formatRate. */
function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params;

  // Exact-id lookup over the loaded set; undefined -> notFound() (T-09-02-01).
  const card: CreditCard | undefined = await getCardById(id);
  if (!card) {
    notFound();
  }

  const locale = await getLocale();
  const isZh = locale === 'zh-HK';
  const t = await getTranslations('cardDetail');
  const tRewardTypes = await getTranslations('rewardTypes');

  // Locale-aware rule description (mirrors CardRecommendationList.getDescription).
  const ruleDescription = (rule: RewardRule): string =>
    isZh && rule.description_zh ? rule.description_zh : rule.description;

  const cta = applyCtaProps(card.applyUrl);
  const hasImage = hasCardImage(card.id);

  const typeBadgeStyle =
    card.cardType === 'crypto'
      ? 'bg-badge-crypto text-white'
      : card.cardType === 'prepaid'
        ? 'bg-badge-prepaid text-white'
        : 'bg-primary text-primary-fg';

  const { annualFee, foreignTransactionFeeRate, redemptionFee } = card.fees;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      {/* Header — hairline-bottom bar, flat (contract §3/§5), mirrors the directory */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Logo size={34} />
            </Link>
            <div className="flex items-center gap-2">
              <DarkModeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Back to directory */}
          <Link
            href="/cards"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-fg hover:text-fg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span aria-hidden>←</span>
            {t('backToDirectory')}
          </Link>

          {/* Header block — issuer bug + type badge + card name */}
          <div className="mt-6 border border-border bg-bg p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 w-9 h-9 relative overflow-hidden border border-border bg-surface flex items-center justify-center">
                  {hasImage ? (
                    <Image
                      src={getCardImageUrl(card.id)}
                      alt={card.issuer}
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-muted-fg">
                      {issuerInitials(card.issuer)}
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted-fg truncate">{card.issuer}</span>
              </div>
              <span
                className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${typeBadgeStyle}`}
              >
                {tRewardTypes.has(card.cardType) ? tRewardTypes(card.cardType) : card.cardType}
              </span>
            </div>

            <h1 className="mt-4 font-[family-name:var(--font-display)] font-extrabold uppercase leading-[1.05] tracking-[-0.02em] text-fg text-balance text-2xl sm:text-3xl">
              {card.name}
            </h1>
          </div>

          {/* Reward rules — every rule in card.rewards, rate + locale-aware description */}
          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase text-fg tracking-[-0.01em]">
              {t('rewardRules')}
            </h2>
            <dl className="mt-3 border-t border-border">
              {card.rewards.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between gap-4 py-3 border-b border-border"
                >
                  <dt className="min-w-0 text-sm text-fg">
                    {ruleDescription(rule)}
                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-fg">
                      {tRewardTypes.has(rule.rewardUnit) ? tRewardTypes(rule.rewardUnit) : rule.rewardUnit}
                      {rule.validUntil ? ` · ${rule.validUntil}` : ''}
                    </span>
                  </dt>
                  <dd className="flex-shrink-0 font-[family-name:var(--font-mono)] text-[15px] font-bold tabular-nums text-right text-fg">
                    {formatRate(rule.rewardRate)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Fees — annual fee, FX fee, redemption fee (Geist Mono tabular) */}
          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase text-fg tracking-[-0.01em]">
              {t('fees')}
            </h2>
            <dl className="mt-3 border-t border-border">
              <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border">
                <dt className="text-[11px] uppercase tracking-wide text-muted-fg">{t('annualFee')}</dt>
                <dd className="font-[family-name:var(--font-mono)] text-[13.5px] font-bold tabular-nums text-right text-fg">
                  {annualFee > 0 ? `HKD $${annualFee.toLocaleString()}` : t('free')}
                </dd>
              </div>
              {foreignTransactionFeeRate !== undefined && (
                <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-fg">{t('fxFee')}</dt>
                  <dd className="font-[family-name:var(--font-mono)] text-[13.5px] font-bold tabular-nums text-right text-fg">
                    {foreignTransactionFeeRate > 0 ? `${(foreignTransactionFeeRate * 100).toFixed(1)}%` : t('free')}
                  </dd>
                </div>
              )}
              {redemptionFee !== undefined && (
                <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-fg">{t('redemptionFee')}</dt>
                  <dd className="font-[family-name:var(--font-mono)] text-[13.5px] font-bold tabular-nums text-right text-fg">
                    {redemptionFee > 0 ? `HKD $${redemptionFee.toLocaleString()}` : t('free')}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Apply CTA — reuses applyCtaProps (rel triplet); link-less card shows no anchor */}
          <div className="mt-8">
            {cta ? (
              <a
                {...cta}
                className="flex items-center justify-center gap-1.5 px-4 py-3.5 border border-[#121212] bg-brand text-[#121212] font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm transition-colors hover:brightness-95"
              >
                {t('apply')}
                <span aria-hidden>→</span>
              </a>
            ) : (
              <p className="px-4 py-3.5 border border-border text-center text-[11px] uppercase tracking-wide text-muted-fg">
                {t('noApplyLink')}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
