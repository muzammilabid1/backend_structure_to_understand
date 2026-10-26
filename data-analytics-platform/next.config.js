/** @type {import('next').NextConfig} */
const path = require('path')

// Load environment variables from parent directory
require('dotenv').config({ path: '../.env.local' });

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lwp-shared'],
  webpack: (config, { isServer }) => {
    // Resolve lwp-shared to its source directory so it works in monorepo
    // deployments (e.g. Vercel) where workspace symlinks may not be present
    config.resolve.alias['lwp-shared'] = path.resolve(__dirname, '../shared')

    // Fix for pg package Cloudflare Workers support
    // Ignore cloudflare:sockets module that's not supported in Node.js
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cloudflare:sockets': false,
      }

      // Also ignore pg-cloudflare module entirely for server builds
      config.externals.push({
        'pg-cloudflare': 'commonjs pg-cloudflare',
      })
    }

    return config
  },
}

module.exports = nextConfig 
