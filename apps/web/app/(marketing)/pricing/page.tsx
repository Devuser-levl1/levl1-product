import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { PricingClient } from '@/components/marketing/pricing-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pricing — Levl1 Hire & Interviews', description: 'Flat-rate pricing for Levl1 Hire and Interviews — never per seat. INR for India, USD worldwide, with an enterprise tier for SSO, SLAs and data residency.' }

export default function Pricing() {
  // Server-side geo hint: explicit cookie wins, else edge/CDN country header.
  const chosen = cookies().get('levl1_currency')?.value
  const country = (headers().get('x-vercel-ip-country') || headers().get('cf-ipcountry') || '').toUpperCase()
  const initial: 'INR' | 'USD' = chosen === 'INR' || chosen === 'USD' ? chosen : country === 'IN' ? 'INR' : 'USD'
  return <PricingClient initialCurrency={initial} />
}
