import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'

// Crawl the marketing site; keep product, candidate and API surfaces out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      // Public job-apply pages stay crawlable (as they are today).
      allow: ['/', '/hire/apply/'],
      disallow: [
        '/api/', '/admin', '/platform', '/dashboard', '/onboarding', '/settings',
        '/hire/', '/interviews/login', '/candidate/', '/interview/', '/report/', '/reports/',
        '/approve/', '/schedule/', '/positions/', '/accept-invite/', '/reset-password', '/forgot-password', '/signup',
      ],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
