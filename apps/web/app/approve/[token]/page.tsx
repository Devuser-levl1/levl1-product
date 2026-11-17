'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Old question-approval links (sent before Fixpack 9) → the in-app review,
// which is now the only place questions are approved. Sign-in is handled by
// the app; reviewers without access are told to ask the recruiter.
export default function ApproveRedirectPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch(`/api/approve/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.ok && typeof d.redirectTo === 'string') router.replace(d.redirectTo)
        else setError(d.error ?? 'This approval link is not valid.')
      })
      .catch(() => setError('Could not open the review. Please try again.'))
  }, [token, router])
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--lv-surface-sunken)', fontFamily: 'var(--lv-font-sans)' }}>
      <div style={{ maxWidth: 440, textAlign: 'center', color: 'var(--lv-text-body)', fontSize: 14, lineHeight: 1.6 }}>
        {error
          ? <><p style={{ fontWeight: 600, color: 'var(--lv-text)' }}>{error}</p><p>Questions are approved inside Levl1 Screen. Ask the recruiter for access to the position.</p></>
          : <p>Opening the question review in Levl1 Screen…</p>}
      </div>
    </main>
  )
}
