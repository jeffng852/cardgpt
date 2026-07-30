/**
 * directoryControls — pure, render-free filter/sort logic for the Card Directory
 * (Phase 9, DIR-01 · 09-CONTEXT D-03).
 *
 * Extracted as a pure helper — mirroring buildCardView — so the search/sort logic
 * is unit-testable in node-env vitest with no component-render devDependency
 * (single-artifact simplicity). Consumed by CardDirectoryClient over the
 * server-loaded card set (client-side interactivity, no engine call).
 *
 * Deferred (RQ-001): type/issuer/hkEligible FILTERS — v1 ships search + sort only.
 *
 * Purity contract: no React, no next-intl, no I/O. All functions are non-mutating.
 */

import type { CreditCard } from '@/types/card';

/** The three sort orders v1 offers (09-CONTEXT D-03). */
export type SortKey = 'rewardRate' | 'annualFee' | 'name';

/** Canonical list of valid sort keys — drives the client's select + URL guard. */
export const SORT_KEYS: readonly SortKey[] = ['rewardRate', 'annualFee', 'name'];

/** The default sort applied when no (or an invalid) `sort` param is present. */
export const DEFAULT_SORT: SortKey = 'rewardRate';

/**
 * Runtime guard for an untrusted `sort` value (e.g. a URL query param).
 * Fails closed: any unrecognized value is rejected (T-09-03-02).
 */
export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value);
}

/** The top (max) reward rate across a card's reward rules; 0 when it has none. */
export function topRewardRate(card: CreditCard): number {
  if (!card.rewards || card.rewards.length === 0) return 0;
  return card.rewards.reduce((max, rule) => (rule.rewardRate > max ? rule.rewardRate : max), 0);
}

/**
 * Free-text search over card NAME and ISSUER (09-CONTEXT D-03).
 * Case-insensitive substring, trimmed. An empty/whitespace query returns every
 * card (a new array — never the input reference, never mutated).
 */
export function filterCards(cards: CreditCard[], query: string): CreditCard[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...cards];
  return cards.filter((card) => {
    const name = card.name?.toLowerCase() ?? '';
    const issuer = card.issuer?.toLowerCase() ?? '';
    return name.includes(needle) || issuer.includes(needle);
  });
}

/**
 * Sort a card list by the given key — always on a COPY (non-mutating):
 * - `rewardRate`: descending by topRewardRate (best first)
 * - `annualFee`:  ascending by fees.annualFee (cheapest first)
 * - `name`:       locale-aware ascending by name
 * An unrecognized key returns the copy in its original order (fail-safe,
 * T-09-03-02) so an out-of-range URL value can neither throw nor reorder oddly.
 */
export function sortCards(cards: CreditCard[], key: SortKey): CreditCard[] {
  const copy = [...cards];
  switch (key) {
    case 'rewardRate':
      return copy.sort((a, b) => topRewardRate(b) - topRewardRate(a));
    case 'annualFee':
      return copy.sort((a, b) => (a.fees.annualFee ?? 0) - (b.fees.annualFee ?? 0));
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy;
  }
}
