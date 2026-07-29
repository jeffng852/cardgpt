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
 * v2 chrome mirrors HomeClient's header (sticky, hairline-bottom, bg-bg).
 */

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Logo } from '@/components/Logo';
import DarkModeToggle from '@/components/DarkModeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CreditCardCard from '@/components/CreditCardCard';
import { buildCardView } from '@/lib/cards/buildCardView';
import type { CreditCard } from '@/types/card';

interface CardDirectoryClientProps {
  cards: CreditCard[];
}

export default function CardDirectoryClient({ cards }: CardDirectoryClientProps) {
  const t = useTranslations('directory');

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

          {/* Card grid — live count drives the grid (D-05), never hardcoded */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/cards/${card.id}`}
                className="block h-full focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <CreditCardCard view={buildCardView(card, { mode: 'browse' })} mode="browse" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
