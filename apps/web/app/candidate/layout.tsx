import type { Metadata } from 'next'
import { SCREEN_ICONS } from '@/components/screen/brand/ScreenLogo'

// Screen route: show the Screen "S" mark as the tab icon (Hire + marketing keep
// the site-wide Levl1 favicon from app/icon.png / app/favicon.ico).
export const metadata: Metadata = { icons: SCREEN_ICONS }

export default function ScreenRouteLayout({ children }: { children: React.ReactNode }) {
  return children
}
