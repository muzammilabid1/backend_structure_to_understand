/** @type {import('next').NextConfig} */
const path = require('path')

// Load environment variables from parent directory (shared with the rest of the monorepo)
require('dotenv').config({ path: '../.env.local' })

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lwp-shared'],
  // HOSTED_URL is the platform url the whole monorepo already shares, but Next inlines only
  // NEXT_PUBLIC_-prefixed names into client bundles; listing it here inlines it under its own name.
  env: {
    HOSTED_URL: process.env.HOSTED_URL ?? '',
  },
  // The load balancer polls /health; the handler lives where every other handler does.
  async rewrites() {
    return [{ source: '/health', destination: '/api/health' }]
  },
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

      config.externals.push({
        'pg-cloudflare': 'commonjs pg-cloudflare',
      })
    }

    return config
  },
}

module.exports = nextConfig
