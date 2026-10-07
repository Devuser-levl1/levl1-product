import { ImageResponse } from 'next/og'
import { OG_PAGES, type OgPageKey } from '@/lib/marketing/og-pages'

// Open Graph card for marketing pages. Text comes only from the OG_PAGES
// whitelist; unknown keys fall back to the home card.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('p') ?? 'home'
  const page = OG_PAGES[(key in OG_PAGES ? key : 'home') as OgPageKey]

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 45%, #4F46E5 75%, #2563EB 100%)', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>L1</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Levl1</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: '#C4B5FD', textTransform: 'uppercase', letterSpacing: 4 }}>{page.eyebrow}</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }}>{page.title}</div>
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>levl1.io</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable' } },
  )
}
