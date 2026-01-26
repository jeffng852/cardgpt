'use client';

import { useEffect, useState } from 'react';

interface Card {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
}

export default function FloatingCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Generate random floating cards
    const generateCards = () => {
      const newCards: Card[] = [];
      const cardCount = window.innerWidth < 768 ? 3 : 6; // Fewer cards on mobile

      for (let i = 0; i < cardCount; i++) {
        newCards.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          rotation: Math.random() * 360,
          scale: 0.6 + Math.random() * 0.4,
          duration: 20 + Math.random() * 10,
          delay: Math.random() * 5,
        });
      }
      setCards(newCards);
    };

    generateCards();
    window.addEventListener('resize', generateCards);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', generateCards);
    };
  }, []);

  if (prefersReducedMotion) {
    return null; // Don't render animations if user prefers reduced motion
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {cards.map((card) => (
        <div
          key={card.id}
          className="absolute w-32 h-20 md:w-40 md:h-24 rounded-xl opacity-5 bg-gradient-to-br from-primary to-primary-hover shadow-lg"
          style={{
            left: `${card.x}%`,
            top: `${card.y}%`,
            transform: `rotate(${card.rotation}deg) scale(${card.scale})`,
            animation: `float ${card.duration}s ease-in-out infinite`,
            animationDelay: `${card.delay}s`,
          }}
        >
          {/* Card chip mockup */}
          <div className="absolute top-3 left-4 w-8 h-6 bg-white/20 rounded"></div>
          {/* Card stripes */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/10"></div>
        </div>
      ))}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(var(--rotation));
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(calc(var(--rotation) + 5deg));
          }
          50% {
            transform: translateY(-10px) translateX(-10px) rotate(var(--rotation));
          }
          75% {
            transform: translateY(-30px) translateX(5px) rotate(calc(var(--rotation) - 5deg));
          }
        }
      `}</style>
    </div>
  );
}
