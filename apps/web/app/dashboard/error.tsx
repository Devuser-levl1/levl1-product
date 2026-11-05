'use client'

import { useEffect } from 'react'

// Route-level safety net for the recruiter dashboard: a render error in any
// section shows a recoverable message instead of a white screen.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[dashboard] render error:', error) }, [error])
  return (
    <div role="alert" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--lv-font-sans)' }}>
      <div style={{ maxWidth: 420, textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 8px' }}>Couldn&apos;t load the dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
          Something went wrong while showing this page. Your data is safe. Try again, or refresh the page.
        </p>
        <button type="button" onClick={reset} className="lv-btn lv-btn--primary" style={{ minHeight: 40, padding: '0 16px' }}>Try again</button>
      </div>
    </div>
  )
}
