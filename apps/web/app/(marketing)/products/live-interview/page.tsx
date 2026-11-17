import { liveInterview } from '@/content/products'
import { pageMetadata } from '@/lib/marketing/metadata'
import { ComingSoonPage } from '@/components/marketing/sections/coming-soon'

export const metadata = pageMetadata({ ...liveInterview.meta, path: '/products/live-interview', og: 'liveInterview' })

export default function LiveInterviewPage() {
  return <ComingSoonPage content={liveInterview} />
}
