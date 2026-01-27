'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isDark = resolvedTheme === 'dark';
    const suffix = isDark ? '-dark' : '';

    // Update favicon
    const favicon32 = document.querySelector('link[rel="icon"][sizes="32x32"]');
    const favicon16 = document.querySelector('link[rel="icon"][sizes="16x16"]');
    const faviconDefault = document.querySelector('link[rel="icon"]:not([sizes])');
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');

    if (favicon32) {
      favicon32.setAttribute('href', `/favicon${suffix ? '-dark' : ''}-32x32.png`);
    }
    if (favicon16) {
      favicon16.setAttribute('href', `/favicon${suffix ? '-dark' : ''}-16x16.png`);
    }
    if (faviconDefault) {
      faviconDefault.setAttribute('href', `/favicon${suffix ? '-dark' : ''}-32x32.png`);
    }
    if (appleTouchIcon) {
      appleTouchIcon.setAttribute('href', isDark ? '/apple-touch-icon-dark.png' : '/apple-touch-icon.png');
    }
  }, [resolvedTheme, mounted]);

  return null;
}
