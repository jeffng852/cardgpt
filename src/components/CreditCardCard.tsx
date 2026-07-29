'use client';

/**
 * CreditCardCard — the shared brutalist card (contract §5).
 *
 * White/--bg surface, 1px --border hairline, square (0 radius), flat (no shadow).
 * Parameterized ranked vs browse (D-05) so the Phase 9 directory reuses it. Takes a
 * CardView from buildCardView (pure derivation) and renders header + data grid +
 * best-for chips + footer CTA. The alignment rule (D-06) is enforced: the card is a
 * full-height flex column, the name reserves a 2-line min-height, the data-grid row
 * set is identical within a view, and the footer is pinned to the bottom
 * (margin-top:auto) so all footers line up across columns.
 *
 * The footer anchor spreads cta.props (the D-05 rel triplet + target) verbatim.
 */

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { CardView, CardViewRow } from '@/lib/cards/buildCardView';
import { getCardImageUrl, hasCardImage } from '@/lib/cardImages';

interface CreditCardCardProps {
  view: CardView;
  mode: 'ranked' | 'browse';
  /** Whether the expandable detail region is open (recommender only). */
  isExpanded?: boolean;
  /** Toggles the detail region; when provided the header/grid becomes a button. */
  onToggle?: () => void;
  /** The expandable detail region (rule breakdown, alerts, fees) rendered by the list. */
  children?: ReactNode;
}

/** Neon fill for the first two best-for chips; the rest are black-filled (contract §5). */
function chipClass(index: number): string {
  if (index === 0) return 'bg-neon-yellow text-[#121212] border border-[#121212]';
  if (index === 1) return 'bg-neon-cyan text-[#121212] border border-[#121212]';
  return 'bg-primary text-primary-fg';
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

export default function CreditCardCard({
  view,
  mode,
  isExpanded = false,
  onToggle,
  children,
}: CreditCardCardProps) {
  const t = useTranslations('results');
  const tRewardTypes = useTranslations('rewardTypes');
  const tCategories = useTranslations('categories');

  // Type-badge colors keyed off the CardView badge (contract §1). CREDIT uses the
  // near-black --primary bug; CRYPTO/PREPAID use their AA-safe dark variants (tokens).
  const badgeStyle =
    view.typeBadge === 'CRYPTO'
      ? 'bg-badge-crypto text-white'
      : view.typeBadge === 'PREPAID'
        ? 'bg-badge-prepaid text-white'
        : 'bg-primary text-primary-fg';

  const rowLabel = (row: CardViewRow): string => {
    switch (row.id) {
      case 'reward':
        return row.amount != null
          ? t('rewardOn', { amount: row.amount.toLocaleString('en-US') })
          : t('estimatedReward');
      case 'topReward':
        return t('topReward');
      case 'rewardType':
        return t('rewardType');
      case 'annualFee':
        return t('annualFee');
      case 'fxFee':
        return t('breakdown.fxFee');
    }
  };

  const rowValue = (row: CardViewRow): string => {
    if (row.free) return t('free');
    if (row.id === 'rewardType') {
      return row.value !== '' ? row.value : tRewardTypes(row.unit ?? 'cash');
    }
    return row.value;
  };

  const chipLabel = (label: string): string =>
    tCategories.has(label) ? tCategories(label) : label;

  // Head block: issuer bug + name + data grid + chips. Clickable when expandable.
  const head = (
    <>
      {/* Header: issuer row + type badge / RECOMMENDED tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 relative overflow-hidden border border-border bg-surface flex items-center justify-center">
            {hasCardImage(view.cardId) ? (
              <Image
                src={getCardImageUrl(view.cardId)}
                alt={view.issuer}
                fill
                className="object-cover"
                sizes="28px"
              />
            ) : (
              <span className="text-[9px] font-mono font-bold text-muted-fg">
                {issuerInitials(view.issuer)}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-fg truncate">{view.issuer}</span>
        </div>
        {view.isTopPick ? (
          <span className="flex-shrink-0 px-2 py-0.5 bg-brand text-[#121212] text-[10px] font-bold uppercase tracking-wide">
            {t('recommended')}
          </span>
        ) : (
          <span
            className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeStyle}`}
          >
            {t(`cardTypes.${view.typeBadge.toLowerCase()}` as 'cardTypes.credit')}
          </span>
        )}
      </div>

      {/* Card name — uppercase display, reserved 2-line min-height (alignment rule D-06) */}
      <h4
        className="mt-3 font-[family-name:var(--font-display)] font-extrabold uppercase leading-[1.1] tracking-[-0.02em] text-fg text-balance"
        style={{ minHeight: `${view.reserveNameLines * 1.1}em` }}
      >
        {view.name}
      </h4>

      {/* Data grid — hairline label/value rows, Geist Mono tabular values */}
      <dl className="mt-3 border-t border-border">
        {view.dataGrid.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-border"
          >
            <dt className="text-[10px] uppercase tracking-wide text-muted-fg">{rowLabel(row)}</dt>
            <dd
              className={`font-[family-name:var(--font-mono)] text-[13.5px] font-bold tabular-nums text-right ${
                row.accent ? 'text-badge-crypto' : 'text-fg'
              }`}
            >
              {rowValue(row)}
            </dd>
          </div>
        ))}
      </dl>

      {/* Best for — neon chips (yellow / cyan / black-filled) */}
      {view.bestFor.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {view.bestFor.map((label, i) => (
            <span
              key={label}
              className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wide ${chipClass(i)}`}
            >
              {chipLabel(label)}
            </span>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-bg border border-border">
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="text-left p-4 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {head}
        </button>
      ) : (
        <div className="p-4">{head}</div>
      )}

      {/* Expandable detail region (recommender breakdown) */}
      {isExpanded && children ? <div className="px-4 pb-2">{children}</div> : null}

      {/* Footer — pinned to bottom (margin-top:auto) so all footers align */}
      <div className="mt-auto">
        {view.cta.noApplyLink ? (
          <p className="px-4 py-3 border-t border-border text-[11px] uppercase tracking-wide text-muted-fg">
            {t('noApplyLink')}
          </p>
        ) : (
          <a
            {...view.cta.props!}
            className={`flex items-center justify-center gap-1.5 px-4 py-3 border-t font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm transition-colors ${
              view.isTopPick
                ? 'bg-brand text-[#121212] border-[#121212] hover:brightness-95'
                : 'bg-bg text-fg border-border hover:bg-surface'
            }`}
          >
            {view.cta.label === 'APPLY' ? t('applyHere') : t('viewCard')}
            <span aria-hidden>→</span>
          </a>
        )}
      </div>
    </div>
  );
}
