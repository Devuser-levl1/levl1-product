import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/config/site'
import { OG_PAGES, type OgPageKey } from '@/lib/marketing/og-pages'

// Per-page metadata for the marketing site: title, description, canonical on
// levl1.io, and an OG/Twitter card rendered by /og for that page.
export function pageMetadata({ title, description, path, og }: {
  title: string
  description: string
  path: string
  og: OgPageKey
}): Metadata {
  const canonical = `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL
  const image = { url: `${SITE_URL}/og?p=${og}`, width: 1200, height: 630, alt: OG_PAGES[og].title }
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', siteName: SITE_NAME, url: canonical, title, description, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  }
}
