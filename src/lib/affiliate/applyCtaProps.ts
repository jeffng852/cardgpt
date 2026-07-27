/**
 * Affiliate Apply-CTA anchor props (AFF-01 / D-05).
 *
 * Pure, render-free helper that decides the `<a>` attributes for the Apply CTA. Extracted
 * from CardRecommendationList so the affiliate-signalling behaviour can be unit-tested in
 * plain node-env vitest without adding a component-render devDependency (single-artifact
 * simplicity — see 08-PATTERNS.md §"No Analog Found").
 *
 * The `rel` value is the locked D-05 triplet:
 *   - `sponsored` + `nofollow` — the affiliate/paid-link signals to search engines.
 *   - `noopener` — retained tab-nabbing mitigation for the `target="_blank"` link
 *     (T-08-AFF-TAB). `noreferrer` is intentionally dropped.
 */

/** Anchor props for the Apply CTA when an affiliate link exists. */
export interface ApplyCtaProps {
  href: string;
  target: '_blank';
  rel: 'sponsored nofollow noopener';
}

/**
 * Returns the Apply-CTA anchor props for a given affiliate URL, or `null` when there is
 * no link (the caller then renders no anchor — AFF-01 "only when applyUrl exists").
 */
export function applyCtaProps(applyUrl?: string): ApplyCtaProps | null {
  if (!applyUrl) {
    return null;
  }

  return {
    href: applyUrl,
    target: '_blank',
    rel: 'sponsored nofollow noopener',
  };
}
