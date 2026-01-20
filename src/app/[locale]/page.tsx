import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold">{t('appName')}</h1>
        <LanguageSwitcher />
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-8">
            {t('tagline')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Coming soon: Credit card recommendation engine
          </p>
        </div>
      </main>
    </div>
  );
}
