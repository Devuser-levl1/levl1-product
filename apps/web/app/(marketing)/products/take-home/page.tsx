import { takeHome } from '@/content/products'
import { pageMetadata } from '@/lib/marketing/metadata'
import { ComingSoonPage } from '@/components/marketing/sections/coming-soon'

export const metadata = pageMetadata({ ...takeHome.meta, path: '/products/take-home', og: 'takeHome' })

export default function TakeHomePage() {
  return <ComingSoonPage content={takeHome} />
}
