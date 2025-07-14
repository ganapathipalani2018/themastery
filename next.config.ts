import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Make build-time environment info available
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  
  // Environment-specific optimizations
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    compress: true,
    poweredByHeader: false,
  }),
};

export default nextConfig;
