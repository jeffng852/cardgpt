/**
 * Affiliate Apply-CTA anchor props (AFF-01 / D-05).
 *
 * The Apply CTA must carry `rel="sponsored nofollow noopener"` and render ONLY when an
 * affiliate link exists. That decision is extracted into the pure `applyCtaProps` helper
 * so it is unit-testable in node-env vitest with no component-render devDependency
 * (single-artifact simplicity). These tests lock the exact D-05 triplet and the
 * null-when-no-link contract.
 */

import { describe, it, expect } from 'vitest';
import { applyCtaProps } from '../applyCtaProps';

describe('applyCtaProps — affiliate-signalled CTA (AFF-01 / D-05)', () => {
  it('returns the D-05 rel triplet and target=_blank for a non-empty applyUrl', () => {
    const props = applyCtaProps('https://issuer.example.com/apply');
    expect(props).toEqual({
      href: 'https://issuer.example.com/apply',
      target: '_blank',
      rel: 'sponsored nofollow noopener',
    });
  });

  it('rel is exactly the affiliate triplet (sponsored + nofollow + noopener)', () => {
    expect(applyCtaProps('https://x.test')?.rel).toBe('sponsored nofollow noopener');
  });

  it('returns null for undefined applyUrl (caller renders no anchor)', () => {
    expect(applyCtaProps(undefined)).toBeNull();
  });

  it('returns null for an empty-string applyUrl', () => {
    expect(applyCtaProps('')).toBeNull();
  });
});
