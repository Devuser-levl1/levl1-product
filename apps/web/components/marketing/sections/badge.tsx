import { LIVE_LABEL, PRODUCTS, SOON_LABEL, type ProductKey } from '@/config/site'

/** Small pill. `live` carries the indigo dot (the accent's "live" state). */
export function Badge({ children, tone = 'neutral', className = '' }: { children: React.ReactNode; tone?: 'neutral' | 'live'; className?: string }) {
  return (
    <span className={`mk-badge ${tone === 'live' ? 'mk-badge-live' : 'mk-badge-neutral'} ${className}`}>
      {tone === 'live' && <span aria-hidden className="mk-dot mk-pulse" />}
      {children}
    </span>
  )
}

/** "Available now" / "Coming soon" for a product, from config. */
export function ProductStatusBadge({ product }: { product: ProductKey }) {
  const live = PRODUCTS[product].status === 'live'
  return <Badge tone={live ? 'live' : 'neutral'}>{live ? LIVE_LABEL : SOON_LABEL}</Badge>
}
