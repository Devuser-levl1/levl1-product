import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Legacy scheduling URL — still what every invite (email, WhatsApp, public
// trigger) links to. It had no consent UI while the booking API requires
// consent, so candidates hit "acknowledge the consent notice" with nothing to
// acknowledge. Forward to the consent-gated, white-label scheduler (keeping
// the ?k= link key a re-issued link carries).
export default function LegacySchedulePage({ params, searchParams }: { params: { interviewId: string }; searchParams: { k?: string } }) {
  const k = typeof searchParams?.k === 'string' && searchParams.k ? `?k=${encodeURIComponent(searchParams.k)}` : ''
  redirect(`/candidate/schedule/${encodeURIComponent(params.interviewId)}${k}`)
}
