import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Legacy scheduling URL — still what every invite (email, WhatsApp, public
// trigger) links to. It had no consent UI while the booking API requires
// consent, so candidates hit "acknowledge the consent notice" with nothing to
// acknowledge. Forward to the consent-gated, white-label scheduler.
export default function LegacySchedulePage({ params }: { params: { interviewId: string } }) {
  redirect(`/candidate/schedule/${encodeURIComponent(params.interviewId)}`)
}
