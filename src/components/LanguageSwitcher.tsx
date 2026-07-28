'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`h-10 min-w-10 px-3 rounded-[2px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[-0.01em] text-sm transition-all ${
            locale === loc
              ? 'bg-brand text-[#121212] border-[1.5px] border-[#121212]'
              : 'bg-bg text-fg border border-border hover:bg-surface'
          }`}
          aria-label={`Switch to ${loc === 'en' ? 'English' : '繁體中文'}`}
        >
          {loc === 'en' ? 'EN' : '繁'}
        </button>
      ))}
    </div>
  );
}
