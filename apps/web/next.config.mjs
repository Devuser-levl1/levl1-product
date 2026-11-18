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
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist', 'pg-boss'],
    // Run instrumentation.ts on server boot so the pg-boss workers register at
    // startup (not only lazily on the first enqueue).
    instrumentationHook: true,
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

  /* ── Permanent (308) redirects ──────────────────────────────────
   *  The Interviews login moved /login → /interviews/login. A real
   *  routing-layer 308 (with a Location header) keeps existing bookmarks,
   *  links, and password-reset / OAuth callbacks working.
   * ─────────────────────────────────────────────────────────────── */
  async redirects() {
    return [
      // One sign-in for the site. /signin renders the existing login page;
      // /interviews/login itself is NOT moved (product code redirects there on
      // session expiry with ?expired=1&next=…).
      { source: '/login', destination: '/signin', permanent: true },
      { source: '/sign-in', destination: '/signin', permanent: true },
      // The login page linked here for a while (it never existed) — keep any
      // bookmarks/shared links working. Create-account lives at /signup.
      { source: '/interviews/signup', destination: '/signup', permanent: true },

      // Old marketing URLs (exact matches only — never product routes such as
      // /hire/login, /hire/apply/*, /interviews/login or webhooks).
      { source: '/hirepilot/agencies', destination: '/solutions/agencies', statusCode: 301 },
      { source: '/hirepilot/enterprise', destination: '/solutions/enterprise', statusCode: 301 },
      { source: '/contact', destination: '/demo', statusCode: 301 },
      { source: '/roadmap', destination: '/products/screen', statusCode: 301 },
      { source: '/interviews', destination: '/products/screen/demo', statusCode: 301 },
      // Product-name URLs (config/site.ts PRODUCTS) → the existing pages. The
      // functional slugs stay; TEMPORARY so they can be flipped if the pages
      // ever move to the name slugs.
      { source: '/products/solve', destination: '/products/take-home', permanent: false },
      { source: '/products/interview', destination: '/products/live-interview', permanent: false },

      // Hire (HirePilot) is hidden from the site and will move to its own
      // domain. TEMPORARY (307, permanent: false) so browsers don't cache them
      // and they can be repointed at the new domain later. Exact matches only:
      // /hire/login, /hire/apply/*, the /hire/* app and webhooks are untouched.
      { source: '/hire', destination: '/hire/login', permanent: false },
      { source: '/hirepilot', destination: '/', permanent: false },
      { source: '/products/hirepilot', destination: '/', permanent: false },
      { source: '/features/hirematch', destination: '/', permanent: false },
    ]
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
