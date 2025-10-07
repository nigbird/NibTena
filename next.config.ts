
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
      }
    ],
  },
};

export default nextConfig;
