'use client';

interface LogoProps {
  /** Scales the wordmark font-size (px). Kept for call-site compatibility. */
  size?: number;
  className?: string;
}

/**
 * CardGPT wordmark (contract §4): the text `CardGPT` in the display face,
 * camelCase with tight tracking, immediately followed by a mint block cursor `▍`
 * that blinks — encoding the conversational/AI nature. Monochrome + the single
 * mint accent, no boxes. The blink respects `prefers-reduced-motion`.
 */
export function Logo({ size = 40, className = '' }: LogoProps) {
  // The wordmark reads best a touch smaller than the old icon box.
  const fontSize = Math.round(size * 0.6);

  return (
    <span
      className={`font-display font-extrabold normal-case select-none ${className}`}
      style={{
        fontSize,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        color: 'var(--fg)',
      }}
      aria-label="CardGPT"
    >
      <span>CardGPT</span>
      <span
        aria-hidden="true"
        className="cardgpt-cursor"
        style={{ color: 'var(--brand)', marginLeft: '0.02em' }}
      >
        ▍
      </span>
      <style>{`
        .cardgpt-cursor {
          animation: cursor-blink 1.06s steps(1, end) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .cardgpt-cursor {
            animation: none;
          }
        }
      `}</style>
    </span>
  );
}
