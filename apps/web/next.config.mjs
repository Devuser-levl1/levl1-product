/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tell Next.js 14's webpack NOT to bundle these CJS/native packages —
    // load them as native Node.js modules at runtime instead.
    // Without this, webpack breaks their internal require() calls and
    // file-system access, turning runtime errors into silent 500s.
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist'],
  },

  /* ── Service Worker: no-cache so browser always fetches the latest ── */
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',    value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type',     value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ]
  },
};

export default nextConfig;
