import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: Proxy to Rust backend is DISABLED to use local TypeScript agent
  // Uncomment to re-enable Rust chatbot:
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/chat/:path*',
  //       destination: 'https://rust-chatbot-service.onrender.com/:path*',
  //     },
  //   ];
  // },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Enable React strict mode
  reactStrictMode: true,

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // Don't optimize TensorFlow.js - we handle it manually via dynamic imports
  },

  // Webpack configuration for TensorFlow.js Node
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude TensorFlow.js Node native bindings from webpack bundling
      config.externals = config.externals || [];
      config.externals.push({
        '@tensorflow/tfjs-node': 'commonjs @tensorflow/tfjs-node',
      });

      // Ignore specific problematic files in tfjs-node
      config.module = config.module || {};
      config.module.noParse = config.module.noParse || [];
      config.module.noParse.push(
        /@tensorflow\/tfjs-node\/node_modules\/@mapbox\/node-pre-gyp/
      );
    }

    return config;
  },

  // Turbopack configuration (empty to silence warning)
  turbopack: {},

  // Server-side externals for native modules
  // This tells Next.js to not bundle these packages and load them externally
  serverExternalPackages: [
    '@tensorflow/tfjs-node',
    '@mapbox/node-pre-gyp',
    'node-pre-gyp',
  ],
};

export default nextConfig;
