/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tell Next.js 14's webpack NOT to bundle these CJS/native packages —
    // load them as native Node.js modules at runtime instead.
    // Without this, webpack breaks their internal require() calls and
    // file-system access, turning runtime errors into silent 500s.
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'pdfjs-dist'],
  },
};

export default nextConfig;
