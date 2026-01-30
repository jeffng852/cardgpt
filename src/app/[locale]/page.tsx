/**
 * Home Page - Server Component
 *
 * Loads card data from blob storage on the server and passes it
 * to the client component for interactive recommendations.
 */

import { loadCards } from '@/lib/data/loadCards';
import HomeClient from '@/components/HomeClient';

// Force dynamic rendering to always fetch fresh card data from blob
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Load cards on server - reads from blob in production
  const cards = await loadCards();

  return <HomeClient cards={cards} />;
}
