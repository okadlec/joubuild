import type { NextConfig } from 'next';

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
};

export default nextConfig;
