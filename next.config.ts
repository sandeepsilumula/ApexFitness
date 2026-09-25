import type { NextConfig } from 'next'

/**
 * Next 16 takes a single dev-server lock per project directory, so a second
 * `next dev` in the same folder refuses to start. The Playwright suite boots
 * its own server, so it asks for a separate build directory via
 * `NEXT_DIST_DIR`; a normal `npm run dev` leaves it unset and keeps `.next`.
 */
const distDir = process.env.NEXT_DIST_DIR

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  // The e2e suite talks to 127.0.0.1 while the dev server binds 0.0.0.0, which
  // Next 16 treats as cross-origin and blocks its dev-only HMR socket.
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
