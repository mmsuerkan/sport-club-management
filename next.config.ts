import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fix WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };
    
    // Fix for @swc/helpers issue
    config.resolve.alias = {
      ...config.resolve.alias,
      '@swc/helpers/_/_interop_require_default': require.resolve('@swc/helpers/_/_interop_require_default'),
    };
    
    // Exclude problematic modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
      };
    }
    
    // Handle WebAssembly modules
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ]
  },
};

export default nextConfig;