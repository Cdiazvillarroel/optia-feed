/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // javascript-lp-solver has optional Node-only modules (lpsolve external solver)
      // we never call them, but webpack tries to bundle them anyway. Stub them out.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        path: false,
      }
    }
    return config
  },
}
module.exports = nextConfig
