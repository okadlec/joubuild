import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { NavigationProgress } from '@/components/shared/navigation-progress';
import { ServiceWorkerRegister } from '@/components/shared/sw-register';
import { CapacitorInit } from '@/components/shared/capacitor-init';
import { getTheme } from '@/lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export async function generateMetadata(): Promise<Metadata> {
  const { getTranslations } = await import('next-intl/server');
  const t = await getTranslations('metadata');
  return {
    title: t('title'),
    description: t('description'),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'JouBuild',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const theme = await getTheme();

  // Static script to detect system dark mode preference before first paint.
  // Contains no user input — hardcoded string only.
  const systemThemeScript =
    '(function(){try{if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.add("dark")}}catch(e){}})()';

  return (
    <html lang={locale} className={theme === 'dark' ? 'dark' : ''} suppressHydrationWarning>
      {theme === 'system' && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: systemThemeScript }} />
        </head>
      )}
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <NavigationProgress />
          {children}
          <Toaster position="top-right" />
          <ServiceWorkerRegister />
          <CapacitorInit />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
