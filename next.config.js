/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true
  },
  // Static export disables API routes (returns 404 for /api/*).
  // Only enable it when building for Capacitor by setting BUILD_TARGET=static.
  ...(process.env.BUILD_TARGET === 'static' ? { output: 'export' } : {}),
};

module.exports = nextConfig;

