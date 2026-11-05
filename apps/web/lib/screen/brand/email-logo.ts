import { appUrl } from '@/lib/screen/app-url'

// ── Screen wordmark for HTML emails (Screen-scoped) ──────────────────────────
// Emails can't use the CSS light/dark switch, so callers pick the variant for
// the surface the logo sits on: onDark → white wordmark, else black. Hosted
// absolute URL (public/brand/screen/*). Ratio 947:374.
export function screenEmailLogoHtml(opts: { onDark?: boolean; height?: number } = {}): string {
  const h = opts.height ?? 36
  const w = Math.round((h * 947) / 374)
  const src = `${appUrl()}/brand/screen/screen-wordmark-${opts.onDark ? 'white' : 'black'}.png`
  return `<img src="${src}" width="${w}" height="${h}" alt="Screen from Levl1" style="display:block;border:0;outline:none;height:${h}px;width:${w}px">`
}
