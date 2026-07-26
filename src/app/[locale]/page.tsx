/**
 * Home Page - Server Component
 *
 * Loads card data from blob storage on the server and passes it
 * to the client component for interactive recommendations.
 */

import { loadCards } from '@/lib/data/loadCards';
import { readRateTableFromRedis } from '@/lib/data/redisStorage';
import HomeClient from '@/components/HomeClient';

// Force dynamic rendering to always fetch fresh card data from blob
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Load cards on server - reads from blob in production
  const cards = await loadCards();

  // Read the crypto→HKD rate table server-side (DEC-DATA-002). Null-safe: an
  // absent key / Redis error yields null, so the crypto path degrades to
  // value-unavailable rather than breaking the page (T-08-RATE-AVAIL). The
  // table is threaded to the engine via the HomeClient prop below.
  const rateTable = await readRateTableFromRedis();

  return <HomeClient cards={cards} rateTable={rateTable ?? undefined} />;
}
