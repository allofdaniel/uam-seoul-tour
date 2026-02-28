import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three', 'mapbox-gl'],
  turbopack: {
    root: '/Users/kimdaniel/uam-seoul-tour',
  },
  serverExternalPackages: ['@google/generative-ai'],
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
};

export default nextConfig;
