
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // react-leaflet 4.2.1's map-creation ref callback is a stale closure (memoized
  // with useCallback(fn, [])), so React 18.3+ StrictMode's dev-only ref
  // double-invoke makes it try to build a second Leaflet map on the same DOM
  // node and throw "Map container is already initialized" whenever the hospital
  // location picker mounts. StrictMode never runs in production, so this only
  // affects local dev. See https://github.com/PaulLeCam/react-leaflet/issues/1133
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'hakimethio.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ethioistanbulgeneralhospital.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'old.ethioistanbulgeneralhospital.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.semafor.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

    