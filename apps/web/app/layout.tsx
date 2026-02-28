import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/shared/sw-register';
import { CapacitorInit } from '@/components/shared/capacitor-init';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'JouBuild - Správa staveb',
  description: 'Platforma pro správu výkresů, úkolů a komunikace na stavbách',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JouBuild',
  },
};

export const viewport: Viewport = {
  themeColor: '#171717',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
        <ServiceWorkerRegister />
        <CapacitorInit />
      </body>
    </html>
  );
}
