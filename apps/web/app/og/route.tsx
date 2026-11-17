import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { OG_PAGES, type OgPageKey } from '@/lib/marketing/og-pages'

// The Levl1 wordmark (transparent PNG, 900×322), embedded once per process.
let wordmark: Promise<string> | null = null
function getWordmark() {
  wordmark ??= readFile(path.join(process.cwd(), 'public/brand/black-text-logo.png')).then((b) => `data:image/png;base64,${b.toString('base64')}`)
  return wordmark
}

// Open Graph card for marketing pages: white, ink text, one indigo top border.
// Text comes only from the OG_PAGES whitelist; unknown keys fall back to home.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('p') ?? 'home'
  const page = OG_PAGES[(key in OG_PAGES ? key : 'home') as OgPageKey]
  const logo = await getWordmark()

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#ffffff', color: '#09090b', borderTop: '12px solid #4F46E5', fontFamily: 'sans-serif' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={134} height={48} alt="Levl1" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: 26, fontWeight: 500, color: '#71717a' }}>{page.eyebrow}</div>
          <div style={{ fontSize: 62, fontWeight: 600, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1020 }}>{page.title}</div>
        </div>
        <div style={{ fontSize: 24, color: '#71717a' }}>levl1.io</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' } },
  )
}
