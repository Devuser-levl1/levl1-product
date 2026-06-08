/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Keep linting active for local dev, but don't let lint errors block
    // production deploys (Render builds).
    ignoreDuringBuilds: true,
  },

  experimental: {
    // Tell Next.js 14's webpack NOT to bundle these CJS/native packages —
    // load them as native Node.js modules at runtime instead.
    // Without this, webpack breaks their internal require() calls and
    // file-system access, turning runtime errors into silent 500s.
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist'],
  },

  /* ── Subdomain rewrites ───────────────────────────────────────────
   *  interview.levl1.app/:token  →  /candidate/interview/:token
   *  interview.levl1.app/:token/complete  →  /candidate/interview/:token/complete
   *
   *  This lets candidates use a clean branded URL while the pages live in
   *  the main app under /candidate/interview/[token].
   * ─────────────────────────────────────────────────────────────── */
  async rewrites() {
    return {
      beforeFiles: [
        // interview.levl1.io — candidate portal. Everything maps under /candidate/*.
        {
          source:      '/:path*',
          destination: '/candidate/:path*',
          has: [{ type: 'host', value: 'interview.levl1.io' }],
        },
        // Legacy interview.levl1.app token links (kept for backwards compatibility).
        {
          source:      '/:token/complete',
          destination: '/candidate/interview/:token/complete',
          has: [{ type: 'host', value: 'interview.levl1.app' }],
        },
        {
          source:      '/:token',
          destination: '/candidate/interview/:token',
          has: [{ type: 'host', value: 'interview.levl1.app' }],
        },
      ],
    }
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
