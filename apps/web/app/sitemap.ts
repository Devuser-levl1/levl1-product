import type { MetadataRoute } from 'next'
import { ROUTES, SITE_URL } from '@/config/site'

// Public marketing pages only. Product/app routes, the hidden Hire pages and
// /signin are excluded (see robots.ts).
const PAGES: { path: string; priority: number }[] = [
  { path: ROUTES.home, priority: 1 },
  { path: ROUTES.screen, priority: 0.9 },
  { path: ROUTES.screenDemo, priority: 0.8 },
  { path: ROUTES.takeHome, priority: 0.6 },
  { path: ROUTES.liveInterview, priority: 0.6 },
  { path: ROUTES.integrity, priority: 0.7 },
  { path: ROUTES.enterprise, priority: 0.8 },
  { path: ROUTES.agencies, priority: 0.7 },
  { path: ROUTES.iaas, priority: 0.5 },
  { path: ROUTES.customAssessments, priority: 0.5 },
  { path: ROUTES.pricing, priority: 0.7 },
  { path: ROUTES.security, priority: 0.6 },
  { path: ROUTES.demo, priority: 0.7 },
  { path: ROUTES.privacy, priority: 0.3 },
  { path: ROUTES.terms, priority: 0.3 },
  { path: ROUTES.cookies, priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority,
  }))
}
