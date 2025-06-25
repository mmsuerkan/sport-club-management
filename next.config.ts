import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ]
  }
};

export default nextConfig;