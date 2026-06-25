import type { Metadata } from 'next'
import { PricingClient } from '@/components/marketing/pricing-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pricing — Levl1 Hire & Interviews', description: 'Levl1 Hire and Levl1 Interviews are priced separately — use one or both. Tell us about your team and we’ll tailor a plan.' }

export default function Pricing() {
  return <PricingClient />
}
