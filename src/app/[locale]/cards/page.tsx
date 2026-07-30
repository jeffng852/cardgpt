/**
 * Card Directory — Server Component (Phase 9, DIR-01).
 *
 * A read-only public browse surface: loads the full active card set via the
 * ungated async `loadCards()` path (returns ALL active cards — the hkEligible
 * gate lives only in the recommender) and hands it to the client grid. It makes
 * NO recommendation-engine call — the directory ranks nothing.
 *
 * Mirrors the home page server→client / force-dynamic pattern so the directory
 * reflects live Redis card data in production (D-05: render the live set, never
 * a hardcoded count).
 */

import { loadCards } from '@/lib/data/loadCards';
import CardDirectoryClient from '@/components/CardDirectoryClient';

// Force dynamic rendering so the directory always reflects fresh card data.
export const dynamic = 'force-dynamic';

export default async function CardsDirectoryPage() {
  // Load all active cards on the server (reads Redis in production). No
  // recommendation engine — the directory is a read-only browse surface.
  const cards = await loadCards();

  return <CardDirectoryClient cards={cards} />;
}
