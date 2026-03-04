'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  async function switchLocale(newLocale: string) {
    if (newLocale === locale) return;
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center rounded-md border bg-muted/50 p-0.5 text-xs">
      <button
        onClick={() => switchLocale('cs')}
        className={cn(
          'rounded px-1.5 py-0.5 font-medium transition-colors',
          locale === 'cs'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        CZ
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={cn(
          'rounded px-1.5 py-0.5 font-medium transition-colors',
          locale === 'en'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        EN
      </button>
    </div>
  );
}
