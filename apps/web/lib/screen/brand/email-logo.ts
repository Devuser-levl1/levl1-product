import { appUrl } from '@/lib/screen/app-url'

// ── Levl1 wordmark for HTML emails ──────────────────────────────────────────
// Emails can't use the CSS light/dark switch, so callers pick the variant for
// the surface the logo sits on: onDark → white wordmark, else black. Hosted
// absolute URL (public/brand/levl1-wordmark-*.png). Ratio 900:322. Sized at 70%
// of the requested height, matching ScreenLogo (callers sized for the old mark).
export function screenEmailLogoHtml(opts: { onDark?: boolean; height?: number } = {}): string {
  const h = Math.round((opts.height ?? 36) * 0.7)
  const w = Math.round((h * 900) / 322)
  // onDark uses the all-white mark: emails put it on an indigo band, where the
  // wordmark's purple "1" would disappear.
  const src = `${appUrl()}/brand/levl1-wordmark-${opts.onDark ? 'mono-white' : 'black'}.png`
  return `<img src="${src}" width="${w}" height="${h}" alt="Levl1" style="display:block;border:0;outline:none;height:${h}px;width:${w}px">`
}
