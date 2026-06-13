import type { Metadata } from 'next'
import { LegalPage, H, P, UL } from '@/components/marketing/legal'
export const metadata: Metadata = { title: 'Cookie Policy — Levl1' }
export default function Cookies() {
  return <LegalPage title="Cookie Policy" updated="June 2026">
    <P>We use a small number of cookies to run Levl1 and, optionally, to understand usage.</P>
    <H>Essential cookies</H><P>Required to sign in, keep you authenticated, and secure the service. These cannot be disabled.</P>
    <H>Analytics cookies (optional)</H><P>Help us understand which pages are useful so we can improve the product. These are off unless you accept them.</P>
    <H>Your choice</H>
    <UL items={['Use the cookie banner to accept all or decline non-essential cookies.', 'Your choice is stored in your browser; clear site data to reset it.', 'You can also block cookies in your browser settings.']} />
    <H>Contact</H><P>hello@levl1.io.</P>
  </LegalPage>
}
