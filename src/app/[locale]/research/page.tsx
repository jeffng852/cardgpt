/**
 * Research — Server Component (Phase 10, RES-01).
 *
 * A static public explainer route: renders the client chrome + editorial
 * reading layout that documents HOW CardGPT ranks cards (and, in a later plan,
 * how crypto rewards are valued in HKD). It makes NO engine or data-layer call —
 * the "accuracy" comes from copy that matches `recommendCards.ts` +
 * `transactionParser.ts`, not from calling them (D-01 / D-03). Content is plain
 * React + next-intl message keys — no CMS, no MDX, no new dependency.
 *
 * Mirrors the thin server→client shape of `cards/page.tsx`, minus `loadCards`
 * and `force-dynamic`: a static content page has nothing dynamic to render.
 */

import ResearchClient from '@/components/ResearchClient';

export default function ResearchPage() {
  return <ResearchClient />;
}
