'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = '' }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show light mode icon by default during SSR/hydration
  const isDark = mounted && resolvedTheme === 'dark';
  const iconSrc = isDark ? '/icon-dark-192.png' : '/icon-192.png';

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconSrc}
        alt="CardGPT"
        width={size}
        height={size}
        className="object-cover"
        priority
      />
    </div>
  );
}
