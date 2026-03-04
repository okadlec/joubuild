import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ServiceWorkerRegister } from '@/components/shared/sw-register';
import { CapacitorInit } from '@/components/shared/capacitor-init';
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

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster position="top-right" />
          <ServiceWorkerRegister />
          <CapacitorInit />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
