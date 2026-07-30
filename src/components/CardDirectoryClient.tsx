'use client';

/**
 * CardDirectoryClient — the public Card Directory grid (Phase 9, DIR-01).
 *
 * Client component taking the server-loaded card set and rendering a responsive
 * grid of browse-mode `CreditCardCard` tiles, each wrapped in a single next-intl
 * `Link` to `/cards/[id]` (detail route ships in 09-02). REUSES the shared card
 * in browse mode — the tile is one anchor, so the card's browse footer renders a
 * NON-anchor VIEW CARD affordance (no nested <a>). The live card count drives the
 * grid — never hardcoded (09-CONTEXT D-05).
 *
 * 09-03 adds free-text SEARCH (name OR issuer) + SORT (reward rate / annual fee /
 * name) over the loaded set via the pure `directoryControls` helper. Both controls
 * are URL-synced (`?q=` / `?sort=`) so a filtered/sorted view is shareable and
 * survives reload (09-CONTEXT D-03). Filters (type/issuer/hkEligible) are deferred
 * (RQ-001). No recommendation-engine call — the directory ranks nothing.
 *
 * v2 chrome mirrors HomeClient's header (sticky, hairline-bottom, bg-bg); the
 * controls follow contract §5 (hairline inputs, 2px radius, 2px mint focus).
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CreditCardCard from '@/components/CreditCardCard';
import { buildCardView } from '@/lib/cards/buildCardView';
import {
  filterCards,
  sortCards,
  isSortKey,
  SORT_KEYS,
  DEFAULT_SORT,
  type SortKey,
} from '@/lib/cards/directoryControls';
import type { CreditCard } from '@/types/card';

interface CardDirectoryClientProps {
  cards: CreditCard[];
}

export default function CardDirectoryClient({ cards }: CardDirectoryClientProps) {
  const t = useTranslations('directory');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Seed control state from the URL so a shared/reloaded link restores the view.
  const sortParam = searchParams.get('sort');
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [sort, setSort] = useState<SortKey>(() =>
    isSortKey(sortParam) ? sortParam : DEFAULT_SORT
  );

  // Reflect control state into the URL (replace, not push, so typing doesn't spam
  // the back-button history). The default sort is omitted to keep URLs clean.
  const syncUrl = useCallback(
    (nextQuery: string, nextSort: SortKey) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set('q', nextQuery);
      if (nextSort !== DEFAULT_SORT) params.set('sort', nextSort);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname]
  );

  const onQueryChange = (value: string) => {
    setQuery(value);
    syncUrl(value, sort);
  };

  const onSortChange = (value: string) => {
    const next = isSortKey(value) ? value : DEFAULT_SORT;
    setSort(next);
    syncUrl(query, next);
  };

  // Pure derivation: filter (name+issuer) then sort. Never mutates `cards`.
  const visibleCards = sortCards(filterCards(cards, query), sort);

  const sortOptionLabel: Record<SortKey, string> = {
    rewardRate: t('sortRewardRate'),
    annualFee: t('sortAnnualFee'),
    name: t('sortName'),
  };

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
              <DarkModeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Directory title — uppercase display (contract §2) */}
          <h1 className="font-display font-extrabold uppercase text-fg tracking-[-0.03em] leading-[1.02] text-3xl sm:text-4xl">
            {t('title')}
          </h1>

          {/* Provenance banner (DIR-02 / DEC-DATA-001) — honest labeling of
              bulk/community-sourced data. Hairline box + left accent (contract §5). */}
          <div className="mt-6 border border-border-strong border-l-[6px] border-l-fg bg-muted px-4 py-4 flex gap-3">
            <span className="font-display font-extrabold uppercase text-[11px] tracking-[0.05em] shrink-0 mt-0.5">
              {t('provenanceEyebrow')}
            </span>
            <p className="text-sm text-fg m-0">{t('provenanceBody')}</p>
          </div>

          {/* Controls — search + sort (contract §5: hairline inputs, 2px radius,
              Inter, 2px mint focus outline). Filters deferred (RQ-001). */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label htmlFor="directory-search" className="sr-only">
                {t('searchPlaceholder')}
              </label>
              <input
                id="directory-search"
                type="search"
                inputMode="search"
                autoComplete="off"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-bg text-fg border border-border-strong rounded-[2px] px-3 py-2.5 text-sm sm:text-base placeholder:text-muted-fg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              />
            </div>
            <div className="sm:w-56">
              <label
                htmlFor="directory-sort"
                className="block text-[10px] font-bold uppercase tracking-wide text-muted-fg mb-1.5"
              >
                {t('sortLabel')}
              </label>
              <select
                id="directory-sort"
                value={sort}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full bg-bg text-fg border border-border-strong rounded-[2px] px-3 py-2.5 text-sm sm:text-base focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {SORT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {sortOptionLabel[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live count — reflects the filtered length (D-05, never hardcoded) */}
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-fg font-[family-name:var(--font-mono)] tabular-nums">
            {t('cardCount', { count: visibleCards.length })}
          </p>

          {/* Empty-state (bilingual) — a no-match search shows a v2 bordered box
              with an uppercase display heading + muted hint, mirroring
              CardRecommendationList's no-results block (09-CONTEXT D-03/D-06). */}
          {visibleCards.length === 0 ? (
            <div className="mt-4 p-8 bg-surface border border-border text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 border border-border mb-4">
                <svg className="w-8 h-8 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase text-fg mb-2">
                {t('emptyTitle')}
              </h2>
              <p className="text-sm text-muted-fg">{t('emptyHint')}</p>
            </div>
          ) : (
            /* Card grid — live filtered/sorted set drives the grid (D-05) */
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {visibleCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/cards/${card.id}`}
                  className="block h-full focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <CreditCardCard view={buildCardView(card, { mode: 'browse' })} mode="browse" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
