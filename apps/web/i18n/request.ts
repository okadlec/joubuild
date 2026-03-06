import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['cs', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'cs';

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage.split(',').map((part) => part.split(';')[0].trim().toLowerCase());
  for (const lang of preferred) {
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('cs')) return 'cs';
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value as Locale | undefined;

  let locale: Locale;
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = detectLocaleFromAcceptLanguage(headerStore.get('accept-language'));
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
