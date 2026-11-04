import { loadCandidateInterview } from '@/lib/candidatePortal'

export const dynamic = 'force-dynamic'

export default async function CandidateCompletePage({
  params,
}: {
  params: { interviewId: string }
}) {
  const result = await loadCandidateInterview(params.interviewId)

  // Even on a bad link we show a graceful thank-you rather than an error here.
  const data = result.ok ? result.data : null
  const brand = data?.brandColor ?? '#4F46E5'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--lv-success-soft) 0%, var(--lv-accent-soft) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'var(--lv-font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--lv-surface)',
          border: '1px solid var(--lv-border)',
          borderRadius: 18,
          padding: '44px 36px',
          textAlign: 'center',
          boxShadow: 'var(--lv-shadow-md)',
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'color-mix(in srgb, var(--lv-success) 12%, transparent)', color: 'var(--lv-success)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 12px' }}>
          Thank you{data ? `, ${data.candidateFirstName}` : ''}!
        </h1>

        <p style={{ fontSize: 16, color: 'var(--lv-text-body)', lineHeight: 1.7, margin: 0 }}>
          {data ? (
            <>
              Your interview for <strong>{data.positionTitle}</strong> at{' '}
              <strong>{data.company}</strong> is complete.
            </>
          ) : (
            'Your interview is complete.'
          )}
        </p>

        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', lineHeight: 1.7, marginTop: 14 }}>
          The hiring team will review your responses and be in touch within{' '}
          <strong>2–3 business days</strong>.
        </p>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--lv-surface-muted)' }}>
          {data?.agencyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agencyLogoUrl} alt={data.agencyName} height={36} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            data && (
              <div style={{ fontSize: 14, fontWeight: 600, color: brand }}>{data.agencyName}</div>
            )
          )}
          <div style={{ fontSize: 12, color: 'var(--lv-border-strong)', marginTop: 8 }}>Powered by Levl1</div>
        </div>
      </div>
    </div>
  )
}
