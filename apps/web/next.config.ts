import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@joubuild/shared', '@joubuild/supabase', '@joubuild/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist tries to require('canvas') which doesn't exist in the browser
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
